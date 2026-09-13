import fs from "node:fs/promises";
import assert from "node:assert/strict";
import crypto from "node:crypto";

const [resultPath, sourcePath] = process.argv.slice(2);
const r = JSON.parse(await fs.readFile(resultPath, "utf8"));
assert.equal(crypto.createHash("sha256").update(await fs.readFile(sourcePath)).digest("hex"), r.sourceSha256);
assert.equal(r.format, "cac-review-v2");
assert.equal(r.rulesVersion, "2026-09-13.v6");
const byId = new Map(r.participants.map(p => [p.id, p]));
assert.equal(byId.size, r.participants.length, "Duplicate participant IDs");
const inputIds = r.input.participants.map(p => p.id);
assert.equal(new Set(inputIds).size, inputIds.length);
assert.deepEqual([...byId.keys()].sort(), [...inputIds].sort(), "Source identities differ from prepared identities");
const assigned = new Set(), proposalIds = new Set(), issues = {}, phases = {};
const start = Date.UTC(2026, 9, 1), end = Date.UTC(2027, 3, 1), day = 86400000;
const formatters = new Map(), profiles = new Map();

function localParts(instant, zone) {
  const fixed = zone.match(/^(?:GMT|UTC)([+-])(\d{1,2})(?::(\d{2}))?$/i);
  let wall;
  if (fixed) {
    assert.ok(Number(fixed[2]) <= 14 && Number(fixed[3] || 0) < 60, "Malformed fixed offset");
    const offset = (fixed[1] === "-" ? -1 : 1) * (Number(fixed[2]) * 60 + Number(fixed[3] || 0));
    wall = instant + offset * 60000;
  } else {
    if (!formatters.has(zone)) formatters.set(zone, new Intl.DateTimeFormat("en-GB", {
      timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }));
    const parts = Object.fromEntries(formatters.get(zone).formatToParts(new Date(instant)).map(p => [p.type, p.value]));
    wall = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
  }
  const d = new Date(wall);
  return { day: d.getUTCDay() || 7, minute: d.getUTCHours() * 60 + d.getUTCMinutes(), offset: (wall - instant) / 60000, wall };
}
function profile(zone) {
  if (!profiles.has(zone)) {
    const offsets = [];
    for (let instant = start + 12 * 3600000; instant < end; instant += day) offsets.push(localParts(instant, zone).offset);
    profiles.set(zone, offsets);
  }
  return profiles.get(zone);
}
function audit(record, acknowledgement = true) {
  assert.ok(record);
  for (const key of ["reviewer", "reason", "at"]) assert.ok(typeof record[key] === "string" && record[key].trim(), "Missing manual audit");
  assert.ok(Number.isFinite(Date.parse(record.at)), "Invalid manual audit date");
  if (acknowledgement) assert.equal(record.acknowledged, true);
}
function manualRecord(record) {
  audit(record);
  assert.match(record.id, /^M-\d{3,}$/);
  assert.ok(Number(record.id.slice(2)) > 0);
  assert.equal(record.memberIds.length, 3);
  assert.equal(new Set(record.memberIds).size, 3);
  for (const id of record.memberIds) assert.ok(byId.has(id));
}
const active = new Map();
for (const record of r.manualMatches || []) {
  manualRecord(record);
  assert.ok(!active.has(record.id), "Duplicate manual record");
  active.set(record.id, record);
}
for (const event of r.manualMatchHistory || []) {
  assert.ok(["CREATE", "RELEASE"].includes(event.action));
  manualRecord(event.match);
  if (event.action === "RELEASE") audit(event, false);
}
for (const p of r.participants) {
  assert.ok(Array.isArray(p.blockingIssues) && Array.isArray(p.unmatchableReasons));
  assert.equal(p.eligible, !p.excluded && !p.unmatchableReasons.length && !p.blockingIssues.length, "Eligibility contradicts recorded holds");
  const exclusion = r.overrides?.[p.id]?.exclusion;
  assert.equal(p.excluded, exclusion?.excluded === true, "Exclusion differs from coordinator decision");
  if (p.excluded) {
    for (const key of ["reviewer", "reason"]) assert.ok(typeof exclusion[key] === "string" && exclusion[key].trim());
  }
}
for (const triad of r.proposals) {
  assert.ok(!proposalIds.has(triad.id), "Duplicate proposal ID");
  proposalIds.add(triad.id);
  phases[triad.phase] = (phases[triad.phase] || 0) + 1;
  assert.equal(triad.status, "PENDING");
  assert.equal(triad.memberIds.length, 3);
  assert.equal(new Set(triad.memberIds).size, 3);
  const manual = triad.phase === "MANUAL";
  assert.ok(["STANDARD", "PEER_EXCEPTION", "TIMEZONE_EXCEPTION", "COMBINED_EXCEPTION", "MANUAL"].includes(triad.phase));
  const people = triad.memberIds.map(id => byId.get(id));
  const flags = new Set(triad.reviewFlags);
  for (const p of people) {
    assert.ok(p, "Unknown assigned participant");
    assert.ok(!assigned.has(p.id), "Duplicate assignment");
    assigned.add(p.id);
    assert.equal(p.excluded, false, "Excluded participant assigned");
    assert.equal(p.unmatchableReasons.length, 0, "Unmatchable participant assigned");
    assert.ok(!p.blockingIssues.includes("CREDENTIAL_UNRESOLVED"), "Unknown credential assigned");
    assert.ok(Number.isInteger(p.credentialRank) && p.credentialRank >= 0 && p.credentialRank <= 3);
    if (!manual) {
      assert.equal(p.membershipConfirmed, true);
      assert.equal(p.eligible, true);
      assert.equal(p.blockingIssues.length, 0);
    } else {
      for (const issue of p.blockingIssues) assert.ok(flags.has(issue), "Manual draft hides underlying hold");
    }
  }
  const ranks = people.map(p => p.credentialRank), low = Math.min(...ranks), high = Math.max(...ranks);
  assert.ok(!(high === 3 && low < 2), "MCC paired with ACC/learning");
  assert.ok(!(low === high && (low === 0 || low === 3)), "Forbidden homogeneous credential triad");
  if (manual) {
    assert.ok(active.has(triad.id), "Manual proposal lacks active record");
    assert.deepEqual(triad.manualDecision, active.get(triad.id), "Manual decision differs from active record");
    assert.deepEqual(triad.memberIds, active.get(triad.id).memberIds);
    assert.equal(triad.score, null);
    assert.equal(triad.subscores, null);
    assert.ok(flags.has("MANUAL_ASSIGNMENT"));
  } else {
    assert.ok(!active.has(triad.id));
    assert.ok(![...flags].some(flag => flag.startsWith("MANUAL_")), "Automatic proposal carries a manual bypass flag");
  }
  const languageKnown = people.every(p => !p.blockingIssues.includes("LANGUAGE_UNRESOLVED"));
  const languageVerified = languageKnown && typeof triad.language === "string" && people.every(p =>
    p.acceptableLanguages.includes(triad.language) && (!p.requiredLanguage || p.requiredLanguage === triad.language));
  if (!languageVerified) {
    assert.ok(manual && flags.has("MANUAL_LANGUAGE_UNVERIFIED"), "Unverified shared language");
    assert.equal(triad.language, null, "Unverified language must not be displayed as evidence");
  } else assert.ok(!flags.has("MANUAL_LANGUAGE_UNVERIFIED"));

  const timezoneKnown = people.every(p => !p.blockingIssues.includes("TIMEZONE_UNRESOLVED"));
  if (timezoneKnown) {
    const offsets = people.map(p => profile(p.timezone));
    const spread = Math.max(...offsets[0].map((_, i) => Math.max(...offsets.map(o => o[i])) - Math.min(...offsets.map(o => o[i]))));
    assert.equal(triad.timezoneSpreadMinutes, spread, "Timezone spread differs from programme daily profile");
    assert.ok(!flags.has("MANUAL_TIMEZONE_UNVERIFIED"));
    if (spread > 180) assert.ok(flags.has("TIMEZONE_OVER_3H"));
    if (["STANDARD", "PEER_EXCEPTION"].includes(triad.phase)) assert.ok(spread <= 180);
  } else {
    assert.ok(manual && flags.has("MANUAL_TIMEZONE_UNVERIFIED"));
    assert.equal(triad.timezoneSpreadMinutes, null);
  }
  const months = new Set();
  assert.ok(Number.isInteger(triad.sharedSlotCount) && triad.sharedSlotCount >= triad.sharedSlots.length);
  assert.equal(new Set(triad.sharedSlots).size, triad.sharedSlots.length);
  for (const slot of triad.sharedSlots) {
    const match = slot.match(/^M([1-6]):(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z)$/);
    assert.ok(match, "Invalid programme slot");
    const instant = Date.parse(match[2]);
    assert.ok(Number.isFinite(instant) && instant >= start && instant + 3600000 <= end);
    assert.equal(new Date(instant).toISOString().slice(0, 16) + "Z", match[2], "Invalid calendar date");
    const date = new Date(instant);
    assert.equal(Number(match[1]), (date.getUTCFullYear() - 2026) * 12 + date.getUTCMonth() - 8);
    months.add(Number(match[1]));
    assert.ok(timezoneKnown, "Slot displayed with unknown timezone");
    for (const p of people) {
      assert.ok(!p.blockingIssues.includes("AVAILABILITY_UNRESOLVED"), "Slot displayed with unresolved availability");
      const local = localParts(instant, p.timezone), finish = localParts(instant + 3600000, p.timezone);
      assert.equal(finish.wall - local.wall, 3600000, "Slot crosses a clock discontinuity");
      assert.ok(p.windows.some(w => {
        const begin = w.localStartTime.split(":").map(Number), end = w.localEndTime.split(":").map(Number);
        return w.weekday === local.day && begin[0] * 60 + begin[1] <= local.minute && end[0] * 60 + end[1] >= local.minute + 60;
      }), "Slot outside submitted local window");
    }
  }
  if (months.size !== 6) assert.ok(manual && flags.has("MANUAL_AVAILABILITY_UNVERIFIED"), "Missing programme month coverage");
  else assert.ok(!flags.has("MANUAL_AVAILABILITY_UNVERIFIED"));
  const hoursKnown = people.every(p => !p.blockingIssues.includes("HOURS_UNRESOLVED"));
  if (hoursKnown) {
    const gap = Math.max(...people.map(p => p.hoursRank)) - Math.min(...people.map(p => p.hoursRank));
    if (gap > 1) assert.ok(flags.has("HOURS_GAP"));
    if (["STANDARD", "TIMEZONE_EXCEPTION"].includes(triad.phase)) assert.ok(gap <= 1);
  }
}
assert.deepEqual([...active.keys()].sort(), r.proposals.filter(p => p.phase === "MANUAL").map(p => p.id).sort());
const held = r.participants.filter(p => !assigned.has(p.id) && !p.excluded && !p.unmatchableReasons.length && !p.eligible);
const excluded = r.participants.filter(p => p.excluded);
const unmatchable = r.participants.filter(p => !p.excluded && p.unmatchableReasons.length);
const unmatched = r.participants.filter(p => !assigned.has(p.id) && p.eligible);
assert.deepEqual([...r.unmatchedIds].sort(), unmatched.map(p => p.id).sort(), "Unmatched identity reconciliation");
const categories = [[...assigned], held.map(p => p.id), excluded.map(p => p.id), unmatchable.map(p => p.id), r.unmatchedIds];
const allIds = categories.flat();
assert.equal(new Set(allIds).size, allIds.length, "Participant categories overlap");
assert.deepEqual([...allIds].sort(), [...byId.keys()].sort(), "Five-way participant reconciliation");
for (const [key, value] of Object.entries({ total: byId.size, assigned: assigned.size, held: held.length, excluded: excluded.length,
  unmatchable: unmatchable.length, unmatched: unmatched.length, matchingPool: assigned.size + unmatched.length,
  triads: r.proposals.length, manualTriads: active.size, standardTriads: phases.STANDARD || 0,
  exceptionTriads: r.proposals.filter(p => !["STANDARD", "MANUAL"].includes(p.phase)).length,
  membershipConfirmed: r.participants.filter(p => p.membershipConfirmed === true).length })) assert.equal(r.summary[key], value, `Summary mismatch: ${key}`);
for (const p of held) for (const code of p.blockingIssues) issues[code] = (issues[code] || 0) + 1;
for (const [id, review] of Object.entries(r.reviews)) {
  const triad = r.proposals.find(p => p.id === id);
  assert.ok(triad, "Review references missing proposal");
  assert.ok(["pending", "rejected", "approved"].includes(review.status));
  if (review.status !== "approved") continue;
  assert.ok(!r.correctionsPending, "Approval with unapplied corrections");
  assert.equal(review.triadId, id);
  assert.deepEqual(review.memberIds, triad.memberIds);
  assert.equal(review.sourceSha256, r.sourceSha256);
  assert.equal(review.rulesVersion, r.rulesVersion);
  assert.equal(review.acknowledged, true);
  assert.ok(typeof review.reviewer === "string" && review.reviewer.trim());
  assert.ok(typeof review.note === "string" && review.note.trim());
  assert.ok(Number.isFinite(Date.parse(review.at)));
  assert.deepEqual([...review.exceptionCodes].sort(), [...triad.reviewFlags].sort());
  assert.ok(triad.memberIds.every(memberId => byId.get(memberId).eligible && !byId.get(memberId).blockingIssues.length), "Approval contains underlying holds");
  assert.ok(!triad.reviewFlags.some(flag => /^MANUAL_.*_UNVERIFIED$/.test(flag)), "Approval contains unverified manual evidence");
}
// Scan every published asset for any actual participant email address.
const sensitive = r.input.participants.flatMap(p => String(p.email).split(/[;,]/)).map(s => s.trim().toLowerCase()).filter(s => s.includes("@"));
async function scan(folder) {
  for (const file of await fs.readdir(folder, { withFileTypes: true })) {
    const full = folder + "/" + file.name;
    if (file.isDirectory()) await scan(full);
    else if (/\.(js|html|json|css|map|txt)$/.test(file.name)) {
      const content = (await fs.readFile(full, "utf8")).toLowerCase();
      assert.ok(!sensitive.some(email => content.includes(email)), `Private email in public asset ${full}`);
    }
  }
}
await scan(new URL("../public", import.meta.url).pathname);
console.log(JSON.stringify({ verified: true, ...r.summary, phases, holdReasons: issues, checks: [
  "source fingerprint", "identity reconciliation", "five disjoint categories", "no duplicate assignments", "hard credential policy",
  "active manual decisions and audit", "shared language or explicit manual uncertainty", "programme daily timezone profiles",
  "displayed 60-minute local windows", "six months or explicit manual uncertainty", "exception flags", "approval evidence", "public asset privacy"
] }, null, 2));
