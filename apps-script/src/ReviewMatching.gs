/* Read-only draft pipeline shared by Node, browser worker and Apps Script V8.
 * Requires CacMatchingCore and CacNormalizationCore. Never sends or publishes.
 */
var CacReviewMatching = (function () {
  "use strict";
  var RULES_VERSION = "2026-09-13.v6";
  var START = Date.UTC(2026, 9, 1), END = Date.UTC(2027, 3, 1), DAY = 86400000;
  var countries = { BKK: "TH", BLR: "IN", CHE: "IN", DEL: "IN", HYD: "IN", CCU: "IN", BOM: "IN", PUN: "IN", CMB: "LK", HKG: "HK", JKT: "ID", JPN: "JP", KOR: "KR", KGZ: "KG", MYS: "MY", PHL: "PH", SGP: "SG", TWN: "TW", VNM: "VN" };
  var formatters = {}, offsetCache = {}, calendarCache = {};
  function text(value) { return String(value || "").trim(); }
  function unique(values) { return Array.from(new Set(values)); }
  // Residence must be an affirmative statement about the participant, not a Chapter/GMT inference.
  var residenceClaim = /(?:\bI\s+(?:currently\s+|now\s+)?(?:live|reside|am\s+(?:(?:currently|now|permanently)\s+)?(?:based|living|residing))|\bI['’]m\s+(?:(?:currently|now|permanently)\s+)?(?:based|living|residing)|(?:^|[.!?]\s+)(?:currently\s+)?(?:based|living|residing)|\bmy\s+(?:home|base|residence)\s+is)\s+in\s+([^!?;\n]*?)(?=\.(?:\s|$)|[!?;\n]|$)/gi;
  var outsideApacPlaces = /\b(?:Europe|European Union|North America|South America|Latin America|Central America|Africa|Caribbean|USA|U\.?S\.?(?:A\.?)?|United States(?: of America)?|Canada|Mexico|United Kingdom|UK|Great Britain|England|Scotland|Wales|Ireland|France|Germany|Netherlands|Belgium|Luxembourg|Switzerland|Austria|Italy|Spain|Portugal|Greece|Denmark|Sweden|Norway|Finland|Iceland|Poland|Czechia|Czech Republic|Slovakia|Hungary|Romania|Bulgaria|Croatia|Slovenia|Serbia|Bosnia|Albania|Kosovo|Montenegro|North Macedonia|Estonia|Latvia|Lithuania|Belarus|Ukraine|Moldova|Malta|Monaco|Andorra|Liechtenstein|San Marino|Vatican|London|Paris|Berlin|Rome|Madrid|Amsterdam|Zurich|Geneva|Helsinki|Stockholm|Oslo|Copenhagen|Vienna|Prague|Warsaw|Dublin|Lisbon|Brussels|Munich|Frankfurt|Barcelona|Milan|Edinburgh|Manchester|Belfast|California|New York|Los Angeles|San Francisco|Seattle|Chicago|Boston|Houston|Dallas|Texas|Florida|Washington|Hawaii|Vancouver|Toronto|Montreal|Ottawa|South Africa|Nigeria|Kenya|Egypt|Morocco|Cape Town|Johannesburg|Cairo|Lagos|Nairobi|Brazil|Argentina|Chile|Peru|Colombia|Ecuador|Bolivia|Uruguay|Paraguay|Venezuela|Costa Rica|Panama|Guatemala|Jamaica|Bahamas)\b/i;
  var travelWords = /\b(?:travel(?:l?ing|s|l?ed)?|overseas|holidays?|vacations?|visiting|work trips?|business trips?|away|temporarily|returning|coming back)\b/i;
  var dateReference = /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|Christmas|\d{1,2}[/-]\d{1,2})\b|\b(?:in|during|until|from|to|of|before|after)\s+May\b|\bMay\s+\d{1,2}\b|\b(?:for|first|last)\s+(?:a few|a|one|two|three|\d+)\s+(?:days?|weeks?|months?)\b/i;
  var absenceWords = /\b(?:unavailable|not available|cannot attend|cannot join|can['’]t attend|can['’]t join|cancel|absent|on leave|difficult)\b/i;
  var datedLocation = /\b(?:(?:will be|currently|presently|I['’]ll be)\s+in|in\s+[^.!?\n]+?\s+(?:until|till|from|between))\b/i;
  function outsideApacResidence(notes) {
    residenceClaim.lastIndex = 0;
    var claim;
    while ((claim = residenceClaim.exec(notes))) {
      var location = claim[1].split(/\b(?:and|but|although|however|while|where|with|working|serving|supporting)\b/i)[0];
      if (/\b(?:until|till|temporarily|for\s+(?:a|one|two|three|\d+)\s+(?:days?|weeks?|months?))\b/i.test(location)) continue;
      if (outsideApacPlaces.test(location)) return claim[0].trim();
    }
    return "";
  }

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
    var exclusion = override.exclusion, excluded = !!exclusion && exclusion.excluded === true;
    if (exclusion !== undefined && (!exclusion || typeof exclusion.excluded !== "boolean")) throw new Error("Invalid exclusion decision");
    if (excluded && (typeof exclusion.reviewer !== "string" || !text(exclusion.reviewer) || typeof exclusion.reason !== "string" || !text(exclusion.reason))) throw new Error("Exclusion requires a reviewer and reason");
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
    var residenceEvidence = outsideApacResidence(notes);
    var unmatchableReasons = residenceEvidence ? ["OUTSIDE_APAC_RESIDENCE"] : [];
    if (travelWords.test(notes) || (dateReference.test(notes) && (absenceWords.test(notes) || datedLocation.test(notes)))) flags.push("TRAVEL_RISK");
    var trivialNote = /^(?:no|none|nil|na|n[./]?a\.?|not applicable|-|no constraints?\.?)?$/i.test(notes);
    if (text(raw.hasConstraints).toLowerCase() === "yes" || !trivialNote) flags.push("SCHEDULING_REVIEW");
    if (text(raw.hasConstraints).toLowerCase() === "yes" && !notes) flags.push("SCHEDULING_DETAILS_MISSING");
    if (/[;,]/.test(text(raw.email))) flags.push("CONTACT_REVIEW");
    var offset = fixedOffset(raw.timezoneRaw), zone = override.timezone || text(raw.timezoneRaw).replace(/\s/g, "");
    var notesOffsets = notes.match(/GMT\s*[+-]\s*\d{1,2}(?::\d{2})?/gi) || [];
    if (!override.timezone && offset === null) block.push("TIMEZONE_UNRESOLVED");
    if (offset !== null && notesOffsets.some(function (v) { return fixedOffset(v) !== offset; })) flags.push("TIMEZONE_NOTE_REVIEW");
    var windows = override.windows || CacNormalizationCore.parseAvailability(raw.availabilityRaw);
    if (!windows.length) block.push("AVAILABILITY_UNRESOLVED");
    var slots = [], offsets = [];
    if (!excluded && !unmatchableReasons.length && block.indexOf("TIMEZONE_UNRESOLVED") === -1) {
      try { var schedule = calendar(windows, zone); slots = schedule.slots; offsets = schedule.offsets; }
      catch (e) { if (e instanceof RangeError) block.push("TIMEZONE_UNRESOLVED"); else throw e; }
    }
    var monthCount = unique(slots.map(function (slot) { return slot.split(":")[0]; })).length;
    if (!excluded && !unmatchableReasons.length && !block.length && monthCount !== 6) block.push("AVAILABILITY_UNRESOLVED");
    var confirmedZoneCountry = override.timezone && (/^Australia\//.test(zone) ? "AU" : /^Pacific\/(Auckland|Chatham)$/.test(zone) ? "NZ" : "");
    return Object.assign({}, raw, { chapter: chapters[0] || "", countryGroup: override.countryGroup || confirmedZoneCountry || countries[chapters[0]] || "", countryBasis: override.countryGroup || confirmedZoneCountry ? "COORDINATOR_CONFIRMED" : "CHAPTER_GEOGRAPHY_PROXY", credential: credential.level, credentialRank: credential.rank, hoursBand: hours.band, hoursRank: hours.rank, acceptableLanguages: languages, languagePreferences: languages, requiredLanguage: localOnly && languages.length === 1 ? languages[0] : null, timezone: zone, timezoneOffsets: offsets, availabilitySlots: slots, windows: windows, blockingIssues: unique(block), reviewFlags: unique(flags), excluded: excluded, unmatchableReasons: unmatchableReasons, residenceEvidence: residenceEvidence, eligible: !excluded && !unmatchableReasons.length && block.length === 0, manualHold: excluded, poolType: "REGULAR", priorPartnerIds: [] });
  }
  function matchingConfig(options) {
    return { seed: options.seed || 20260912, shortlistSize: options.shortlistSize || 18, restartCount: options.restartCount || 8, availabilityTargetSlots: 180, allowPeerExceptions: false, excludedTriads: options.excludedTriads || [], weights: { crossChapter: 10, country: 20, credential: 25, coachingHours: 20, availability: 15, languagePreference: 5, avoidRepeatPairing: 0, timezone: 5 } };
  }
  function summarize(participants, proposals, unmatchedIds) {
    var assigned = proposals.map(function (p) { return p.memberIds; }).flat(), assignedIds = new Set(assigned);
    if (assignedIds.size !== assigned.length) throw new Error("Duplicate assignment");
    var held = participants.filter(function (p) { return !assignedIds.has(p.id) && !p.eligible && !p.excluded && !p.unmatchableReasons.length; }).length;
    var excluded = participants.filter(function (p) { return p.excluded; }).length;
    var unmatchable = participants.filter(function (p) { return !p.excluded && p.unmatchableReasons.length; }).length;
    if (assigned.length + unmatchedIds.length + held + excluded + unmatchable !== participants.length) throw new Error("Participant reconciliation failed");
    return { total: participants.length, membershipConfirmed: participants.filter(function (p) { return p.membershipConfirmed === true; }).length, held: held, excluded: excluded, unmatchable: unmatchable, matchingPool: assigned.length + unmatchedIds.length, triads: proposals.length, assigned: assigned.length, unmatched: unmatchedIds.length, standardTriads: proposals.filter(function (p) { return p.phase === "STANDARD"; }).length, manualTriads: proposals.filter(function (p) { return p.phase === "MANUAL"; }).length, exceptionTriads: proposals.filter(function (p) { return p.phase !== "STANDARD" && p.phase !== "MANUAL"; }).length };
  }
  function requireManualAudit(decision, acknowledge) {
    if (!decision || ["reviewer", "reason", "at"].some(function (field) { return typeof decision[field] !== "string" || !text(decision[field]); }) || !Number.isFinite(Date.parse(decision.at)) || (acknowledge && decision.acknowledged !== true)) throw new Error("MANUAL_REVIEW_REQUIRED");
  }
  function manualRecord(record) {
    if (!record || typeof record.id !== "string" || !/^M-\d{3,}$/.test(record.id) || Number(record.id.slice(2)) < 1 || !Array.isArray(record.memberIds) || record.memberIds.length !== 3 || record.memberIds.some(function (id) { return typeof id !== "string" || !text(id); }) || unique(record.memberIds).length !== 3) throw new Error("MANUAL_SELECTION_INVALID");
    requireManualAudit(record, true);
    return Object.freeze({ id: record.id, memberIds: Object.freeze(record.memberIds.slice()), reviewer: record.reviewer, reason: record.reason, at: record.at, acknowledged: true });
  }
  function manualMembers(record, byId, assignedIds) {
    var members = record.memberIds.map(function (id) { return byId.get(id); });
    if (members.some(function (p) { return !p || p.excluded || p.unmatchableReasons.length; })) throw new Error("MANUAL_PARTICIPANT_UNAVAILABLE");
    if (record.memberIds.some(function (id) { return assignedIds.has(id); })) throw new Error("MANUAL_ALREADY_ASSIGNED");
    if (members.some(function (p) { return p.blockingIssues.indexOf("CREDENTIAL_UNRESOLVED") !== -1; })) throw new Error("MANUAL_CREDENTIAL_UNRESOLVED");
    if (!CacMatchingCore.credentialsCompatible(members[0], members[1], members[2])) throw new Error("MANUAL_CREDENTIAL_CONFLICT");
    record.memberIds.forEach(function (id) { assignedIds.add(id); });
    return members;
  }
  function manualProposal(record, members, config) {
    var score = CacMatchingCore.scoreTriad(members, config);
    var blocking = unique(members.map(function (p) { return p.blockingIssues; }).flat());
    var language = blocking.indexOf("LANGUAGE_UNRESOLVED") === -1 ? score.commonLanguage : null;
    var timezone = Number.isFinite(score.timezoneSpreadMinutes) ? score.timezoneSpreadMinutes : null;
    var flags = score.exceptions.filter(function (flag) { return !(flag === "TIMEZONE_OVER_3H" && timezone === null) && !(flag === "HOURS_GAP" && blocking.indexOf("HOURS_UNRESOLVED") !== -1); }).concat(blocking, ["MANUAL_ASSIGNMENT"]);
    if (!language) flags.push("MANUAL_LANGUAGE_UNVERIFIED");
    if (timezone === null) flags.push("MANUAL_TIMEZONE_UNVERIFIED");
    if (![1, 2, 3, 4, 5, 6].every(function (month) { return score.sharedSlots.some(function (slot) { return slot.indexOf("M" + month + ":") === 0; }); })) flags.push("MANUAL_AVAILABILITY_UNVERIFIED");
    if (members.some(function (p) { return p.countryBasis === "CHAPTER_GEOGRAPHY_PROXY"; })) flags.push("COUNTRY_BASIS_REVIEW");
    return { id: record.id, memberIds: record.memberIds.slice(), phase: "MANUAL", score: null, subscores: null, manualDecision: record, language: language, timezoneSpreadMinutes: timezone, sharedSlotCount: score.sharedSlots.length, sharedSlots: [1, 2, 3, 4, 5, 6].map(function (month) { return score.sharedSlots.filter(function (slot) { return slot.indexOf("M" + month + ":") === 0; }).slice(0, 4); }).flat(), reviewFlags: unique(flags), status: "PENDING", roleRotation: [[0, 1, 2], [1, 2, 0], [2, 0, 1], [0, 1, 2], [1, 2, 0], [2, 0, 1]] };
  }
  function addManualMatch(report, record) {
    if (report.correctionsPending || report.rulesVersion !== RULES_VERSION) throw new Error("MANUAL_PENDING_CORRECTIONS");
    record = manualRecord(record);
    var active = report.manualMatches || [], history = report.manualMatchHistory || [];
    if (active.some(function (match) { return match.id === record.id; }) || history.some(function (event) { return event.match.id === record.id; }) || report.proposals.some(function (p) { return p.id === record.id; })) throw new Error("MANUAL_SELECTION_INVALID");
    var selectedIds = new Set(record.memberIds);
    var prepared = report.input.participants.filter(function (raw) { return selectedIds.has(raw.id); }).map(function (raw) { return prepare(raw, (report.overrides || {})[raw.id]); });
    var assigned = new Set(report.proposals.map(function (p) { return p.memberIds; }).flat());
    var members = manualMembers(record, new Map(prepared.map(function (p) { return [p.id, p]; })), assigned);
    if (members.some(function (p) { return p.eligible && report.unmatchedIds.indexOf(p.id) === -1; })) throw new Error("MANUAL_PARTICIPANT_UNAVAILABLE");
    var proposals = report.proposals.concat([manualProposal(record, members, matchingConfig({ seed: report.seed }))]);
    var unmatchedIds = report.unmatchedIds.filter(function (id) { return record.memberIds.indexOf(id) === -1; });
    return Object.assign({}, report, { proposals: proposals, unmatchedIds: unmatchedIds, manualMatches: active.concat([record]), manualMatchHistory: history.concat([{ action: "CREATE", match: record }]), summary: summarize(report.participants, proposals, unmatchedIds) });
  }
  function removeManualMatch(report, id, decision) {
    var active = report.manualMatches || [], record = active.find(function (match) { return match.id === id; });
    if (!record) throw new Error("MANUAL_MATCH_NOT_FOUND");
    requireManualAudit(decision, false);
    var proposals = report.proposals.filter(function (p) { return p.id !== id; });
    // Pending corrections still describe a future run; release changes only the current draft.
    var released = new Set(record.memberIds), unmatchedIds = report.unmatchedIds.slice();
    report.participants.forEach(function (p) { if (released.has(p.id) && p.eligible && unmatchedIds.indexOf(p.id) === -1) unmatchedIds.push(p.id); });
    var reviews = Object.assign({}, report.reviews); delete reviews[id];
    return Object.assign({}, report, { proposals: proposals, reviews: reviews, unmatchedIds: unmatchedIds, manualMatches: active.filter(function (match) { return match.id !== id; }), manualMatchHistory: (report.manualMatchHistory || []).concat([{ action: "RELEASE", match: record, reviewer: decision.reviewer, reason: decision.reason, at: decision.at }]), summary: summarize(report.participants, proposals, unmatchedIds) });
  }
  function run(input, overrides, options) {
    options = options || {};
    var participants = input.participants.map(function (raw) { return prepare(raw, (overrides || {})[raw.id]); });
    if (unique(participants.map(function (p) { return p.id; })).length !== participants.length) throw new Error("Duplicate participant IDs");
    if (options.manualMatches !== undefined && !Array.isArray(options.manualMatches)) throw new Error("MANUAL_SELECTION_INVALID");
    var manualMatches = (options.manualMatches || []).map(manualRecord);
    if (unique(manualMatches.map(function (record) { return record.id; })).length !== manualMatches.length) throw new Error("MANUAL_SELECTION_INVALID");
    var reserved = new Set(), byId = new Map(participants.map(function (p) { return [p.id, p]; }));
    var config = matchingConfig(options);
    var manualProposals = manualMatches.map(function (record) { return manualProposal(record, manualMembers(record, byId, reserved), config); });
    var eligible = participants.filter(function (p) { return p.eligible && !reserved.has(p.id); });
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
    proposals = proposals.concat(manualProposals);
    var unmatchedIds = remaining.map(function (p) { return p.id; });
    return { format: "cac-review-v2", rulesVersion: RULES_VERSION, seed: config.seed, sourceName: input.sourceName, sourceSha256: input.sourceSha256, generatedAt: new Date().toISOString(), status: "DRAFT", overrides: overrides || {}, input: input, participants: participants.map(function (p) { var copy = Object.assign({}, p); delete copy.availabilitySlots; delete copy.timezoneOffsets; return copy; }), proposals: proposals, manualMatches: manualMatches, manualMatchHistory: [], unmatchedIds: unmatchedIds, summary: summarize(participants, proposals, unmatchedIds), reviews: {} };
  }
  return { run: run, addManualMatch: addManualMatch, removeManualMatch: removeManualMatch, prepare: prepare, calendar: calendar, offsetAt: offsetAt, fixedOffset: fixedOffset, RULES_VERSION: RULES_VERSION };
})();
