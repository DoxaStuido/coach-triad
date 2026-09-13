import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../src/MatchingCore.gs", import.meta.url), "utf8");
const context = { Set, Array, Object, Number, Math, String, Boolean, Infinity };
vm.createContext(context);
vm.runInContext(source, context);
const core = context.CacMatchingCore;

function participant(overrides = {}) {
  return {
    id: "P-001",
    chapter: "SG",
    credentialRank: 1,
    hoursRank: 1,
    acceptableLanguages: ["en"],
    languagePreferences: ["en"],
    requiredLanguage: null,
    timezoneOffsets: [480, 480, 480, 480, 480, 480],
    availabilitySlots: [
      "M1:1:0100Z",
      "M2:1:0100Z",
      "M3:1:0100Z",
      "M4:1:0100Z",
      "M5:1:0100Z",
      "M6:1:0100Z"
    ],
    priorPartnerIds: [],
    poolType: "REGULAR",
    eligible: true,
    manualHold: false,
    ...overrides
  };
}

test("hard constraints accept a three-chapter triad within three hours", () => {
  const triad = [
    participant({ id: "P-001", chapter: "SG", timezoneOffsets: [480, 480, 480, 480, 480, 480] }),
    participant({ id: "P-002", chapter: "IN", timezoneOffsets: [330, 330, 330, 330, 330, 330] }),
    participant({ id: "P-003", chapter: "TH", timezoneOffsets: [420, 420, 420, 420, 420, 420] })
  ];
  assert.equal(core.passesHardConstraints(triad), true);
  assert.equal(core.scoreTriad(triad).distinctChapterCount, 3);
});

test("hard constraints reject an Auckland and Singapore spread over three hours", () => {
  const triad = [
    participant({ id: "P-001", chapter: "SG", timezoneOffsets: [480, 480, 480, 480, 480, 480] }),
    participant({ id: "P-002", chapter: "AU", timezoneOffsets: [780, 780, 780, 780, 780, 780] }),
    participant({ id: "P-003", chapter: "MY", timezoneOffsets: [480, 480, 480, 480, 480, 480] })
  ];
  assert.equal(core.maximumTimezoneSpread(triad), 300);
  assert.equal(core.passesHardConstraints(triad), false);
});

test("local-language-only requirement overrides Chapter diversity but remains reviewable", () => {
  const triad = [
    participant({ id: "P-001", chapter: "VN", acceptableLanguages: ["vi"], languagePreferences: ["vi"], requiredLanguage: "vi" }),
    participant({ id: "P-002", chapter: "VN", acceptableLanguages: ["vi", "en"], languagePreferences: ["vi", "en"] }),
    participant({ id: "P-003", chapter: "VN", acceptableLanguages: ["vi", "en"], languagePreferences: ["vi", "en"] })
  ];
  assert.equal(core.passesHardConstraints(triad), true);
  const score = core.scoreTriad(triad);
  assert.equal(score.commonLanguage, "vi");
  assert.ok(Array.from(score.exceptions).includes("LANGUAGE_OVERRIDES_CHAPTER"));
});

test("credential and coaching-hour similarity raise the soft score", () => {
  const similar = [
    participant({ id: "P-001", chapter: "SG", credentialRank: 2, hoursRank: 2 }),
    participant({ id: "P-002", chapter: "IN", credentialRank: 2, hoursRank: 2 }),
    participant({ id: "P-003", chapter: "TH", credentialRank: 2, hoursRank: 2 })
  ];
  const mixed = [
    participant({ id: "P-004", chapter: "SG", credentialRank: 0, hoursRank: 0 }),
    participant({ id: "P-005", chapter: "IN", credentialRank: 2, hoursRank: 2 }),
    participant({ id: "P-006", chapter: "TH", credentialRank: 3, hoursRank: 3 })
  ];
  assert.ok(core.scoreTriad(similar).total > core.scoreTriad(mixed).total);
});

test("matching is deterministic and uses a backup only to match regular participants", () => {
  const regular = [
    participant({ id: "P-001", chapter: "SG" }),
    participant({ id: "P-002", chapter: "IN" }),
    participant({ id: "P-003", chapter: "TH" }),
    participant({ id: "P-004", chapter: "MY" })
  ];
  const backups = [
    participant({ id: "B-001", chapter: "TW", poolType: "BACKUP_BOARD" }),
    participant({ id: "B-002", chapter: "HK", poolType: "BACKUP_BOARD" })
  ];
  const config = { restartCount: 12, seed: 42 };
  const first = core.matchParticipants(regular, backups, config);
  const second = core.matchParticipants(regular, backups, config);
  const ids = solution => Array.from(solution.triads, triad => Array.from(triad.members, member => member.id).sort().join("|")).sort();
  assert.deepEqual(ids(first), ids(second));
  assert.equal(first.metrics.regularMatched, 4);
  assert.equal(first.metrics.backupUsed, 2);
  assert.equal(first.unmatched.length, 0);
});

test("rematch ranks a regular candidate ahead of a board backup", () => {
  const remaining = [
    participant({ id: "P-001", chapter: "SG" }),
    participant({ id: "P-002", chapter: "IN" })
  ];
  const candidates = [
    participant({ id: "B-001", chapter: "TW", poolType: "BACKUP_BOARD" }),
    participant({ id: "P-003", chapter: "TH", poolType: "REGULAR" })
  ];
  const proposals = core.proposeRematch(remaining, candidates, {}, 5);
  assert.equal(proposals[0].members[2].id, "P-003");
});

test("matching groups a 300-participant pool without duplicate assignments", () => {
  const chapters = ["SG", "IN", "TH", "MY", "TW", "HK"];
  const regular = Array.from({ length: 300 }, (_, index) => participant({
    id: `P-${String(index + 1).padStart(3, "0")}`,
    chapter: chapters[index % chapters.length],
    credentialRank: index % 4,
    hoursRank: index % 4
  }));
  const solution = core.matchParticipants(regular, [], {
    restartCount: 5,
    shortlistSize: 24,
    seed: 20260918
  });
  const assignedIds = Array.from(solution.triads, triad => Array.from(triad.members, member => member.id)).flat();
  assert.equal(solution.triads.length, 100);
  assert.equal(solution.unmatched.length, 0);
  assert.equal(new Set(assignedIds).size, 300);
  assert.ok(Array.from(solution.triads).every(triad => core.passesHardConstraints(Array.from(triad.members))));
});
