import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../src/NormalizationCore.gs", import.meta.url), "utf8");
const context = { Set, Array, Object, String, RegExp };
vm.createContext(context);
vm.runInContext(source, context);
const core = context.CacNormalizationCore;

test("normalizes email and multi-Chapter source answers", () => {
  assert.equal(core.normalizeEmail("  Coach@Example.COM "), "coach@example.com");
  assert.deepEqual(
    Array.from(core.normalizeChapters("The Bengaluru Chapter, The Chennai Chapter")),
    ["BLR", "CHE"]
  );
});

test("normalizes credential and coaching-hour bands", () => {
  assert.deepEqual({ ...core.normalizeCredential("PCC (Professional Certified Coach), In learning process") }, { level: "PCC", rank: 2 });
  assert.deepEqual({ ...core.normalizeHours("1, 000 +") }, { band: "1000_PLUS", rank: 3 });
  assert.deepEqual({ ...core.normalizeHours("100 - 499") }, { band: "100_499", rank: 1 });
});

test("normalizes language aliases and English comfort mode", () => {
  assert.deepEqual(Array.from(core.normalizeLanguages("Bahasa Indonesia + Englisj + Mandarin")), ["id", "zh", "en"]);
  assert.equal(core.languageMode("No, I would prefer to use a share local language only"), "LOCAL_ONLY");
  assert.equal(core.languageMode("Yes, but also open to practicing in a shared local language if my triad agrees;"), "LOCAL_PREFERRED");
});

test("parses repeated weekday and time windows", () => {
  const windows = core.parseAvailability("Monday, 08:00 ~ 17:00, Thursday, 18:00 ~ 21:00");
  assert.deepEqual(Array.from(windows, item => ({ ...item })), [
    { weekday: 1, localStartTime: "08:00", localEndTime: "17:00" },
    { weekday: 4, localStartTime: "18:00", localEndTime: "21:00" }
  ]);
});

test("auto-maps fixed APAC offsets but leaves Australasia and multiple offsets for review", () => {
  assert.equal(core.fixedTimezoneForRawOffset("GMT +5:30"), "Asia/Kolkata");
  assert.equal(core.fixedTimezoneForRawOffset("GMT+8"), "Asia/Singapore");
  assert.equal(core.fixedTimezoneForRawOffset("GMT+10"), null);
  assert.equal(core.fixedTimezoneForRawOffset("GMT+7, GMT+8"), null);
});
