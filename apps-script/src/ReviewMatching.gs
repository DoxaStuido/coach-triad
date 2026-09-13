/* Read-only draft pipeline shared by Node, browser worker and Apps Script V8.
 * Requires CacMatchingCore and CacNormalizationCore. Never sends or publishes.
 */
var CacReviewMatching = (function () {
  "use strict";
  var RULES_VERSION = "2026-09-12.v2";
  var START = Date.UTC(2026, 9, 1), END = Date.UTC(2027, 3, 1), DAY = 86400000;
  var countries = { BKK: "TH", BLR: "IN", CHE: "IN", DEL: "IN", HYD: "IN", CCU: "IN", BOM: "IN", PUN: "IN", CMB: "LK", HKG: "HK", JKT: "ID", JPN: "JP", KOR: "KR", KGZ: "KG", MYS: "MY", PHL: "PH", SGP: "SG", TWN: "TW", VNM: "VN" };
  var formatters = {}, offsetCache = {}, calendarCache = {};
  function text(value) { return String(value || "").trim(); }
  function unique(values) { return Array.from(new Set(values)); }
  function fixedOffset(raw) {
    var found = text(raw).replace(/\s/g, "").match(/^(?:GMT|UTC)([+-])(\d{1,2})(?::(\d{2}))?$/i);
    if (!found || Number(found[2]) > 14 || Number(found[3] || 0) >= 60) return null;
    return (found[1] === "-" ? -1 : 1) * (Number(found[2]) * 60 + Number(found[3] || 0));
  }
  function offsetAt(instant, zone) {
    var fixed = fixedOffset(zone);
    if (fixed !== null) return fixed;
    var key = zone + ":" + instant;
    if (offsetCache[key] !== undefined) return offsetCache[key];
    var parts;
    if (typeof Utilities !== "undefined") {
      parts = Utilities.formatDate(new Date(instant), zone, "yyyy-MM-dd-HH-mm").split("-").map(Number);
    } else {
      if (!formatters[zone]) formatters[zone] = new Intl.DateTimeFormat("en-GB", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
      var record = {};
      formatters[zone].formatToParts(new Date(instant)).forEach(function (p) { record[p.type] = p.value; });
      parts = [record.year, record.month, record.day, record.hour, record.minute].map(Number);
    }
    var offset = Math.round((Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4]) - instant) / 60000);
    offsetCache[key] = offset;
    return offset;
  }
  function localToUtc(wall, zone) {
    var guess = wall;
    for (var i = 0; i < 3; i++) guess = wall - offsetAt(guess, zone) * 60000;
    return guess + offsetAt(guess, zone) * 60000 === wall ? guess : null;
  }
  function calendar(windows, zone) {
    var key = zone + JSON.stringify(windows);
    if (calendarCache[key]) return calendarCache[key];
    var slots = [], offsets = [];
    for (var date = START; date < END; date += DAY) {
      offsets.push(offsetAt(date + 12 * 3600000, zone));
      var day = new Date(date).getUTCDay() || 7;
      windows.filter(function (w) { return w.weekday === day; }).forEach(function (w) {
        var start = w.localStartTime.split(":").map(Number), end = w.localEndTime.split(":").map(Number);
        var first = start[0] * 60 + start[1], last = end[0] * 60 + end[1];
        for (var minute = first; minute + 60 <= last; minute += 30) {
          var utc = localToUtc(date + minute * 60000, zone);
          var finish = localToUtc(date + (minute + 60) * 60000, zone);
          if (utc === null || finish - utc !== 3600000 || utc < START || finish > END) continue;
          var moment = new Date(utc), month = (moment.getUTCFullYear() - 2026) * 12 + moment.getUTCMonth() - 8;
          slots.push("M" + month + ":" + moment.toISOString().slice(0, 16) + "Z");
        }
      });
    }
    var result = { slots: unique(slots), offsets: offsets };
    calendarCache[key] = result;
    return result;
  }
  function prepare(raw, override) {
    override = override || {};
    var block = [], flags = [], chapters = CacNormalizationCore.normalizeChapters(raw.chapterRaw);
    if (raw.membershipConfirmed !== true) block.push("MEMBERSHIP_UNCONFIRMED");
    var commitment = override.commitment === undefined ? text(raw.commitment).toLowerCase() === "yes" : override.commitment === true;
    if (!commitment) block.push("COMMITMENT_UNCONFIRMED");
    if (chapters.length !== 1) block.push("CHAPTER_UNRESOLVED");
    var credentialRaw = override.credential || text(raw.credentialRaw);
    var credentialChoices = credentialRaw.toUpperCase().match(/\bACC\b|\bPCC\b|\bMCC\b|LEARNING/g) || [];
    if (unique(credentialChoices).length !== 1) block.push("CREDENTIAL_UNRESOLVED");
    var credential = CacNormalizationCore.normalizeCredential(credentialRaw), hours = CacNormalizationCore.normalizeHours(raw.hoursRaw);
    if (!/^(1\s*[~–-]\s*99|100\s*[~–-]\s*499|500\s*[~–-]\s*999|1,?\s*000\s*\+)$/i.test(text(raw.hoursRaw))) block.push("HOURS_UNRESOLVED");
    var localOnly = CacNormalizationCore.languageMode(raw.englishAnswer) === "LOCAL_ONLY";
    if (override.languages && (!Array.isArray(override.languages) || override.languages.some(function (code) { return !/^(en|zh|yue|th|vi|id|ms|ja|ko|hi|ta|te|mr|tl|fr)$/.test(code); }))) throw new Error("Invalid confirmed language codes");
    var languages = override.languages || CacNormalizationCore.normalizeLanguages(raw.languageRaw);
    if (!override.languages && !localOnly && /^yes/i.test(text(raw.englishAnswer))) languages = unique(languages.concat(["en"]));
    // Generic 'Chinese' is not proof of Mandarin or Cantonese compatibility.
    if (!override.languages && /chinese|中文/i.test(text(raw.languageRaw)) && !/mandarin|putonghua/i.test(text(raw.languageRaw))) languages = languages.filter(function (code) { return code !== "zh"; });
    if (localOnly) languages = languages.filter(function (code) { return code !== "en"; });
    if (!languages.length || (localOnly && languages.length !== 1)) block.push("LANGUAGE_UNRESOLVED");
    var notes = text(raw.schedulingNotes);
    var trivialNote = /^(?:no|none|nil|na|n[./]?a\.?|not applicable|-|no constraints?\.?)?$/i.test(notes);
    if (text(raw.hasConstraints).toLowerCase() === "yes" || !trivialNote) flags.push("SCHEDULING_REVIEW");
    if (text(raw.hasConstraints).toLowerCase() === "yes" && !notes) flags.push("SCHEDULING_DETAILS_MISSING");
    if (/[;,]/.test(text(raw.email))) flags.push("CONTACT_REVIEW");
    var offset = fixedOffset(raw.timezoneRaw), zone = override.timezone || text(raw.timezoneRaw).replace(/\s/g, "");
    var notesOffsets = notes.match(/GMT\s*[+-]\s*\d{1,2}(?::\d{2})?/gi) || [];
    if (!override.timezone && (offset === null || Math.abs(offset) > 540 || chapters[0] === "AU" || notesOffsets.some(function (v) { return fixedOffset(v) !== offset; }))) block.push("TIMEZONE_UNRESOLVED");
    if (/travel|overseas|Los Angeles|Europe|Canada|United Kingdom|London|\bUSA\b|\bU\.S\./i.test(notes)) block.push("TEMPORARY_LOCATION_REVIEW");
    var windows = override.windows || CacNormalizationCore.parseAvailability(raw.availabilityRaw);
    if (!windows.length) block.push("AVAILABILITY_UNRESOLVED");
    var slots = [], offsets = [];
    if (!block.some(function (v) { return /TIMEZONE|LOCATION|AVAILABILITY/.test(v); })) {
      try { var schedule = calendar(windows, zone); slots = schedule.slots; offsets = schedule.offsets; }
      catch (e) { if (e instanceof RangeError) block.push("TIMEZONE_UNRESOLVED"); else throw e; }
    }
    var monthCount = unique(slots.map(function (slot) { return slot.split(":")[0]; })).length;
    if (!block.length && monthCount !== 6) block.push("AVAILABILITY_UNRESOLVED");
    var confirmedZoneCountry = override.timezone && (/^Australia\//.test(zone) ? "AU" : /^Pacific\/(Auckland|Chatham)$/.test(zone) ? "NZ" : "");
    return Object.assign({}, raw, { chapter: chapters[0] || "", countryGroup: override.countryGroup || confirmedZoneCountry || countries[chapters[0]] || "", countryBasis: override.countryGroup || confirmedZoneCountry ? "COORDINATOR_CONFIRMED" : "CHAPTER_GEOGRAPHY_PROXY", credential: credential.level, credentialRank: credential.rank, hoursBand: hours.band, hoursRank: hours.rank, acceptableLanguages: languages, languagePreferences: languages, requiredLanguage: localOnly && languages.length === 1 ? languages[0] : null, timezone: zone, timezoneOffsets: offsets, availabilitySlots: slots, windows: windows, blockingIssues: unique(block), reviewFlags: unique(flags), eligible: block.length === 0, manualHold: false, poolType: "REGULAR", priorPartnerIds: [] });
  }
  function run(input, overrides, options) {
    options = options || {};
    var participants = input.participants.map(function (raw) { return prepare(raw, (overrides || {})[raw.id]); });
    if (unique(participants.map(function (p) { return p.id; })).length !== participants.length) throw new Error("Duplicate participant IDs");
    var eligible = participants.filter(function (p) { return p.eligible; });
    var config = { seed: options.seed || 20260912, shortlistSize: options.shortlistSize || 18, restartCount: options.restartCount || 8, availabilityTargetSlots: 180, allowPeerExceptions: false, excludedTriads: options.excludedTriads || [], weights: { crossChapter: 10, country: 20, credential: 25, coachingHours: 20, availability: 15, languagePreference: 5, avoidRepeatPairing: 0, timezone: 5 } };
    var result = CacMatchingCore.matchParticipants(eligible, [], config);
    var triads = result.triads.map(function (p) { return Object.assign(p, { phase: "STANDARD" }); });
    var remaining = result.unmatched;
    // Relax one policy family at a time, only for the unmatched pool; no active triads are broken.
    [{ name: "PEER_EXCEPTION", timezone: 180, peer: true }, { name: "TIMEZONE_EXCEPTION", timezone: 1440, peer: false }, { name: "COMBINED_EXCEPTION", timezone: 1440, peer: true }].forEach(function (pass) {
      if (remaining.length < 3) return;
      var passConfig = Object.assign({}, config, { maxTimezoneSpreadMinutes: pass.timezone, allowPeerExceptions: pass.peer, restartCount: 4 });
      var next = CacMatchingCore.matchParticipants(remaining, [], passConfig);
      triads = triads.concat(next.triads.map(function (p) { return Object.assign(p, { phase: pass.name }); }));
      remaining = next.unmatched;
    });
    var proposals = triads.map(function (p, i) {
      var risks = p.score.exceptions.slice();
      if (p.members.some(function (m) { return m.countryBasis === "CHAPTER_GEOGRAPHY_PROXY"; })) risks.push("COUNTRY_BASIS_REVIEW");
      return { id: "T-" + String(i + 1).padStart(3, "0"), memberIds: p.members.map(function (m) { return m.id; }), phase: p.phase, score: p.score.total, language: p.score.commonLanguage, timezoneSpreadMinutes: p.score.timezoneSpreadMinutes, sharedSlotCount: p.score.sharedSlots.length, sharedSlots: [1, 2, 3, 4, 5, 6].map(function (month) { return p.score.sharedSlots.filter(function (s) { return s.indexOf("M" + month + ":") === 0; }).slice(0, 4); }).flat(), reviewFlags: unique(risks), subscores: p.score.subscores, status: "PENDING", roleRotation: [[0, 1, 2], [1, 2, 0], [2, 0, 1], [0, 1, 2], [1, 2, 0], [2, 0, 1]] };
    });
    var assigned = proposals.map(function (p) { return p.memberIds; }).flat();
    if (unique(assigned).length !== assigned.length) throw new Error("Duplicate assignment");
    if (assigned.length + remaining.length + participants.filter(function (p) { return !p.eligible; }).length !== participants.length) throw new Error("Participant reconciliation failed");
    return { format: "cac-review-v2", rulesVersion: RULES_VERSION, seed: config.seed, sourceName: input.sourceName, sourceSha256: input.sourceSha256, generatedAt: new Date().toISOString(), status: "DRAFT", overrides: overrides || {}, input: input, participants: participants.map(function (p) { var copy = Object.assign({}, p); delete copy.availabilitySlots; delete copy.timezoneOffsets; return copy; }), proposals: proposals, unmatchedIds: remaining.map(function (p) { return p.id; }), summary: { total: participants.length, membershipConfirmed: participants.filter(function (p) { return p.membershipConfirmed === true; }).length, held: participants.filter(function (p) { return !p.eligible; }).length, matchingPool: eligible.length, triads: proposals.length, assigned: assigned.length, unmatched: remaining.length, standardTriads: proposals.filter(function (p) { return p.phase === "STANDARD"; }).length, exceptionTriads: proposals.filter(function (p) { return p.phase !== "STANDARD"; }).length }, reviews: {} };
  }
  return { run: run, prepare: prepare, calendar: calendar, offsetAt: offsetAt, fixedOffset: fixedOffset, RULES_VERSION: RULES_VERSION };
})();
