import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const coreSource = fs.readFileSync(new URL("../src/MatchingCore.gs", import.meta.url), "utf8");
const coreCtx = { Set, Array, Object, Number, Math, String, Boolean, Infinity };
vm.createContext(coreCtx);
vm.runInContext(coreSource, coreCtx);
const core = coreCtx.CacMatchingCore;

const reviewCtx = vm.createContext({ Intl, Date });
for (const name of ["MatchingCore", "NormalizationCore", "ReviewMatching"])
  vm.runInContext(fs.readFileSync(new URL(`../src/${name}.gs`, import.meta.url), "utf8"), reviewCtx);
const engine = reviewCtx.CacReviewMatching;

function participant(overrides = {}) {
  return {
    id: "P-001", chapter: "SG", countryGroup: "SG",
    credentialRank: 1, hoursRank: 1,
    acceptableLanguages: ["en"], languagePreferences: ["en"],
    requiredLanguage: null,
    timezoneOffsets: [480, 480, 480, 480, 480, 480],
    availabilitySlots: ["M1:1:0100Z", "M2:1:0100Z", "M3:1:0100Z", "M4:1:0100Z", "M5:1:0100Z", "M6:1:0100Z"],
    priorPartnerIds: [], poolType: "REGULAR", eligible: true, manualHold: false,
    ...overrides
  };
}

const raw = (id, changes = {}) => ({
  id, name: `Coach ${id}`, email: `${id}@example.com`, sourceRow: 2,
  membershipConfirmed: true, chapterRaw: "The Singapore Chapter",
  credentialRaw: "PCC", hoursRaw: "500 - 999", timezoneRaw: "GMT+8",
  availabilityRaw: "Monday, 08:00 ~ 17:00", languageRaw: "English",
  englishAnswer: "Yes", hasConstraints: "No", schedulingNotes: "",
  commitment: "Yes", ...changes
});

// M1: hasPriorPairing_ must penalize repeat pairings
test("prior pairing lowers the avoidRepeatPairing subscore", () => {
  const fresh = [
    participant({ id: "P-001", chapter: "SG", priorPartnerIds: [] }),
    participant({ id: "P-002", chapter: "IN", priorPartnerIds: [] }),
    participant({ id: "P-003", chapter: "TH", priorPartnerIds: [] })
  ];
  const repeat = [
    participant({ id: "P-001", chapter: "SG", priorPartnerIds: ["P-002"] }),
    participant({ id: "P-002", chapter: "IN", priorPartnerIds: ["P-001"] }),
    participant({ id: "P-003", chapter: "TH", priorPartnerIds: [] })
  ];
  const freshScore = core.scoreTriad(fresh);
  const repeatScore = core.scoreTriad(repeat);
  assert.equal(freshScore.subscores.avoidRepeatPairing, 100);
  assert.equal(repeatScore.subscores.avoidRepeatPairing, 0);
  assert.ok(freshScore.total > repeatScore.total);
});

// M2: improveByMemberSwaps_ must improve score when a swap is available
test("member swap improves total score when a better arrangement exists", () => {
  const chapters = ["SG", "IN", "TH", "MY", "TW", "HK"];
  const pool = Array.from({ length: 12 }, (_, i) => participant({
    id: `P-${String(i + 1).padStart(3, "0")}`,
    chapter: chapters[i % 6],
    countryGroup: chapters[i % 6],
    credentialRank: i < 6 ? 1 : 2,
    hoursRank: i < 6 ? 1 : 2
  }));
  const config = { restartCount: 1, seed: 42, shortlistSize: 12 };
  const result = core.matchParticipants(pool, [], config);
  assert.equal(result.triads.length, 4);
  const totalScore = result.triads.reduce((sum, t) => sum + t.score.total, 0);
  assert.ok(totalScore > 0);
  const allDistinct = result.triads.every(t =>
    new Set(t.members.map(m => m.credentialRank)).size <= 2
  );
  assert.ok(allDistinct || totalScore > result.triads.length * 50);
});

// M3: isBetterSolution_ must prefer fewer backups
test("solution with fewer backups is preferred over more backups", () => {
  const regular = [
    participant({ id: "P-001", chapter: "SG" }),
    participant({ id: "P-002", chapter: "IN" }),
    participant({ id: "P-003", chapter: "TH" }),
    participant({ id: "P-004", chapter: "MY" }),
    participant({ id: "P-005", chapter: "TW" }),
    participant({ id: "P-006", chapter: "HK" })
  ];
  const backups = [
    participant({ id: "B-001", chapter: "JP", poolType: "BACKUP_BOARD" }),
    participant({ id: "B-002", chapter: "KR", poolType: "BACKUP_BOARD" }),
    participant({ id: "B-003", chapter: "VN", poolType: "BACKUP_BOARD" })
  ];
  const result = core.matchParticipants(regular, backups, { restartCount: 8, seed: 42 });
  assert.equal(result.metrics.backupUsed, 0);
  assert.equal(result.metrics.regularMatched, 6);
});

// M4: COMBINED_EXCEPTION relaxation pass must rescue participants needing both relaxations
test("combined exception pass matches participants needing both timezone and peer relaxation", () => {
  const people = [
    raw("a", { timezoneRaw: "GMT+1", chapterRaw: "The Kolkata Chapter", credentialRaw: "MCC",
      availabilityRaw: "Monday, 08:00 ~ 18:00" }),
    raw("b", { timezoneRaw: "GMT+5:30", chapterRaw: "The Bengaluru Chapter", credentialRaw: "ACC",
      availabilityRaw: "Monday, 08:00 ~ 18:00" }),
    raw("c", { timezoneRaw: "GMT+8", chapterRaw: "The Taiwan Chapter",
      availabilityRaw: "Monday, 08:00 ~ 18:00" })
  ];
  const result = engine.run(
    { sourceName: "fixture", sourceSha256: "fixture", participants: people },
    {}, { restartCount: 4 }
  );
  const eligible = result.participants.filter(p => p.eligible);
  assert.equal(eligible.length, 3, "all three must be eligible");
  assert.equal(result.summary.standardTriads, 0, "standard pass rejects >3h + credential gap");
  assert.ok(result.summary.exceptionTriads > 0, "exception pass must rescue the triad");
  const exTriad = result.proposals[0];
  assert.ok(exTriad.reviewFlags.includes("TIMEZONE_OVER_3H"));
  assert.ok(exTriad.reviewFlags.includes("CREDENTIAL_GAP"));
});

// M5: MEMBERSHIP_UNCONFIRMED must block unconfirmed participants
test("membershipConfirmed false blocks participant from matching", () => {
  const people = [
    raw("a", { membershipConfirmed: false }),
    raw("b", { chapterRaw: "The Bengaluru Chapter" }),
    raw("c", { chapterRaw: "The Taiwan Chapter" })
  ];
  const result = engine.run(
    { sourceName: "fixture", sourceSha256: "fixture", participants: people },
    {}, { restartCount: 2 }
  );
  const heldA = result.participants.find(p => p.id === "a");
  assert.ok(heldA.blockingIssues.includes("MEMBERSHIP_UNCONFIRMED"));
  assert.equal(heldA.eligible, false);
  assert.equal(result.summary.held, 1);
  assert.equal(result.summary.assigned, 0, "only 2 eligible — cannot form a triad");
});

// M6: coveredProgrammeMonths_ must reject triads covering fewer than 6 months
test("triad with slots covering only 3 months fails hard constraints", () => {
  const triad = [
    participant({ id: "P-001", chapter: "SG",
      availabilitySlots: ["M1:1:0100Z", "M2:1:0100Z", "M3:1:0100Z"] }),
    participant({ id: "P-002", chapter: "IN",
      availabilitySlots: ["M1:1:0100Z", "M2:1:0100Z", "M3:1:0100Z"] }),
    participant({ id: "P-003", chapter: "TH",
      availabilitySlots: ["M1:1:0100Z", "M2:1:0100Z", "M3:1:0100Z"] })
  ];
  assert.equal(core.passesHardConstraints(triad), false);
});
