/* global Utilities */
var CacMatchingCore = (function () {
  "use strict";

  var DEFAULT_CONFIG = {
    maxTimezoneSpreadMinutes: 180,
    minSharedSlots: 1,
    minimumMonthCoverage: 6,
    availabilityTargetSlots: 18,
    shortlistSize: 24,
    restartCount: 24,
    seed: 20260918,
    allowPeerExceptions: true,
    weights: {
      crossChapter: 30,
      credential: 20,
      coachingHours: 20,
      availability: 15,
      languagePreference: 10,
      avoidRepeatPairing: 5
    }
  };

  function mergeConfig(config) {
    config = config || {};
    return {
      maxTimezoneSpreadMinutes: numberOr_(config.maxTimezoneSpreadMinutes, DEFAULT_CONFIG.maxTimezoneSpreadMinutes),
      minSharedSlots: numberOr_(config.minSharedSlots, DEFAULT_CONFIG.minSharedSlots),
      minimumMonthCoverage: numberOr_(config.minimumMonthCoverage, DEFAULT_CONFIG.minimumMonthCoverage),
      availabilityTargetSlots: numberOr_(config.availabilityTargetSlots, DEFAULT_CONFIG.availabilityTargetSlots),
      shortlistSize: numberOr_(config.shortlistSize, DEFAULT_CONFIG.shortlistSize),
      restartCount: numberOr_(config.restartCount, DEFAULT_CONFIG.restartCount),
      seed: numberOr_(config.seed, DEFAULT_CONFIG.seed),
      allowPeerExceptions: config.allowPeerExceptions !== false,
      excludedTriads: config.excludedTriads || [],
      weights: Object.assign({}, DEFAULT_CONFIG.weights, config.weights || {})
    };
  }

  function numberOr_(value, fallback) {
    var number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function unique_(values) {
    return Array.from(new Set((values || []).filter(Boolean)));
  }

  var setCache_ = new WeakMap();
  var constantOffsetCache_ = new WeakMap();
  function cachedSet_(values) {
    if (!setCache_.has(values)) setCache_.set(values, new Set(values));
    return setCache_.get(values);
  }
  function intersection_(collections) {
    if (!collections.length) return [];
    var ordered = collections.slice().sort(function (a, b) { return a.length - b.length; });
    var sets = ordered.slice(1).map(cachedSet_);
    return unique_(ordered[0]).filter(function (value) {
      return sets.every(function (set) { return set.has(value); });
    });
  }

  function commonLanguages(triad) {
    return intersection_(triad.map(function (member) {
      return member.acceptableLanguages || [];
    }));
  }

  function requiredLanguagesSatisfied(triad, common) {
    return triad.every(function (member) {
      return !member.requiredLanguage || common.indexOf(member.requiredLanguage) !== -1;
    });
  }

  function sharedAvailabilitySlots(triad) {
    return intersection_(triad.map(function (member) {
      return member.availabilitySlots || [];
    }));
  }

  function coveredProgrammeMonths_(slots) {
    return unique_((slots || []).map(function (slot) {
      var match = String(slot).match(/^M(\d+):/);
      return match && Number(match[1]) >= 1 && Number(match[1]) <= 6 ? match[1] : null;
    }));
  }

  function maximumTimezoneSpread(triad) {
    var profiles = triad.map(function (member) {
      return member.timezoneOffsets || [];
    });
    if (profiles.some(function (profile) { return profile.length < 6 || profile.length !== profiles[0].length; })) return Infinity;
    var constants = profiles.map(function (profile) {
      if (!constantOffsetCache_.has(profile)) constantOffsetCache_.set(profile, profile.every(function (value) { return Number.isFinite(Number(value)) && Number(value) === Number(profile[0]); }) ? Number(profile[0]) : null);
      return constantOffsetCache_.get(profile);
    });
    if (constants.every(function (value) { return value !== null; })) return Math.max.apply(null, constants) - Math.min.apply(null, constants);

    var monthCount = Math.min.apply(null, profiles.map(function (profile) { return profile.length; }));
    var maximum = 0;
    for (var month = 0; month < monthCount; month++) {
      var offsets = profiles.map(function (profile) { return Number(profile[month]); });
      if (offsets.some(function (offset) { return !Number.isFinite(offset); })) return Infinity;
      maximum = Math.max(maximum, Math.max.apply(null, offsets) - Math.min.apply(null, offsets));
    }
    return maximum;
  }

  function passesHardConstraints(triad, rawConfig) {
    var config = mergeConfig(rawConfig);
    if (!Array.isArray(triad) || triad.length !== 3) return false;
    if (unique_(triad.map(function (member) { return member.id; })).length !== 3) return false;
    if (config.excludedTriads.indexOf(triad.map(function (member) { return member.id; }).sort().join("|")) !== -1) return false;
    if (!triad.every(function (member) { return member.eligible === true && member.manualHold !== true; })) return false;
    if (!config.allowPeerExceptions && peerExceptions(triad).length) return false;

    var common = commonLanguages(triad);
    if (!common.length || !requiredLanguagesSatisfied(triad, common)) return false;
    if (maximumTimezoneSpread(triad) > config.maxTimezoneSpreadMinutes) return false;
    var sharedSlots = sharedAvailabilitySlots(triad);
    if (sharedSlots.length < config.minSharedSlots) return false;
    if (coveredProgrammeMonths_(sharedSlots).length < config.minimumMonthCoverage) return false;
    return true;
  }

  function spreadScore_(values) {
    var numeric = values.map(Number);
    var gap = Math.max.apply(null, numeric) - Math.min.apply(null, numeric);
    return [100, 70, 30, 0][Math.min(3, Math.max(0, gap))];
  }

  function peerExceptions(triad) {
    var credentials = triad.map(function (p) { return p.credentialRank; });
    var hours = triad.map(function (p) { return p.hoursRank; });
    var reasons = [];
    if (Math.max.apply(null, credentials) - Math.min.apply(null, credentials) > 1) reasons.push("CREDENTIAL_GAP");
    if (Math.max.apply(null, hours) - Math.min.apply(null, hours) > 1) reasons.push("HOURS_GAP");
    return reasons;
  }

  function crossChapterScore_(triad) {
    var count = unique_(triad.map(function (member) { return member.chapter; })).length;
    return count === 3 ? 100 : count === 2 ? 50 : 0;
  }

  function preferredLanguage_(triad, common) {
    var candidates = common.map(function (language) {
      var ranks = triad.map(function (member) {
        var rank = (member.languagePreferences || []).indexOf(language);
        return rank === -1 ? 4 : rank + 1;
      });
      var averageRank = ranks.reduce(function (sum, rank) { return sum + rank; }, 0) / ranks.length;
      return { language: language, averageRank: averageRank, score: Math.max(0, 125 - averageRank * 25) };
    });
    candidates.sort(function (a, b) {
      return b.score - a.score || a.language.localeCompare(b.language);
    });
    return candidates[0] || { language: null, averageRank: Infinity, score: 0 };
  }

  function hasPriorPairing_(triad) {
    for (var left = 0; left < triad.length; left++) {
      for (var right = left + 1; right < triad.length; right++) {
        var prior = triad[left].priorPartnerIds || [];
        var reverse = triad[right].priorPartnerIds || [];
        if (prior.indexOf(triad[right].id) !== -1 || reverse.indexOf(triad[left].id) !== -1) return true;
      }
    }
    return false;
  }

  function scoreTriad(triad, rawConfig) {
    var config = mergeConfig(rawConfig);
    var common = commonLanguages(triad);
    var preferred = preferredLanguage_(triad, common);
    var sharedSlots = sharedAvailabilitySlots(triad);
    var distinctChapters = unique_(triad.map(function (member) { return member.chapter; })).length;
    var credentialRanks = triad.map(function (member) { return member.credentialRank; });
    var hoursRanks = triad.map(function (member) { return member.hoursRank; });
    var credentialGap = Math.max.apply(null, credentialRanks) - Math.min.apply(null, credentialRanks);
    var hoursGap = Math.max.apply(null, hoursRanks) - Math.min.apply(null, hoursRanks);

    var subscores = {
      crossChapter: crossChapterScore_(triad),
      country: triad.every(function (p) { return p.countryGroup; }) ? (unique_(triad.map(function (p) { return p.countryGroup; })).length - 1) * 50 : 0,
      credential: spreadScore_(credentialRanks),
      coachingHours: spreadScore_(hoursRanks),
      availability: Math.min(100, sharedSlots.length / config.availabilityTargetSlots * 100),
      languagePreference: preferred.score,
      avoidRepeatPairing: hasPriorPairing_(triad) ? 0 : 100,
      timezone: maximumTimezoneSpread(triad) <= 120 ? 100 : maximumTimezoneSpread(triad) <= 180 ? 60 : 0
    };

    var weightTotal = Object.keys(config.weights).reduce(function (sum, key) {
      return sum + Number(config.weights[key] || 0);
    }, 0);
    var weighted = Object.keys(config.weights).reduce(function (sum, key) {
      return sum + subscores[key] * Number(config.weights[key] || 0);
    }, 0);

    var exceptions = peerExceptions(triad);
    if (maximumTimezoneSpread(triad) > 180) exceptions.push("TIMEZONE_OVER_3H");
    if (triad.every(function (p) { return p.countryGroup; }) && subscores.country < 100) exceptions.push("COUNTRY_DIVERSITY");
    if (triad.some(function (p) { return p.requiredLanguage; })) exceptions.push("LOCAL_LANGUAGE");
    triad.forEach(function (p) { exceptions = exceptions.concat(p.reviewFlags || []); });
    if (distinctChapters < 3) exceptions.push("CHAPTER_DIVERSITY");
    if (triad.some(function (member) { return member.poolType === "BACKUP_BOARD"; })) exceptions.push("BACKUP_USED");
    if (distinctChapters < 3 && triad.some(function (member) { return member.requiredLanguage; })) {
      exceptions.push("LANGUAGE_OVERRIDES_CHAPTER");
    }

    return {
      total: weightTotal ? Math.round(weighted / weightTotal * 10) / 10 : 0,
      commonLanguage: preferred.language,
      sharedSlots: sharedSlots,
      timezoneSpreadMinutes: maximumTimezoneSpread(triad),
      distinctChapterCount: distinctChapters,
      credentialGap: credentialGap,
      hoursGap: hoursGap,
      subscores: subscores,
      exceptions: unique_(exceptions)
    };
  }

  function pairMayBeCompatible_(left, right, config) {
    if (!left.eligible || !right.eligible || left.manualHold || right.manualHold) return false;
    if (!config.allowPeerExceptions && peerExceptions([left, right]).length) return false;
    var common = intersection_([left.acceptableLanguages || [], right.acceptableLanguages || []]);
    if (!common.length) return false;
    if (left.requiredLanguage && common.indexOf(left.requiredLanguage) === -1) return false;
    if (right.requiredLanguage && common.indexOf(right.requiredLanguage) === -1) return false;
    if (maximumTimezoneSpread([left, right]) > config.maxTimezoneSpreadMinutes) return false;
    var sharedSlots = intersection_([left.availabilitySlots || [], right.availabilitySlots || []]);
    if (sharedSlots.length < config.minSharedSlots) return false;
    if (coveredProgrammeMonths_(sharedSlots).length < config.minimumMonthCoverage) return false;
    return true;
  }

  function buildCompatibilityIndex_(participants, config) {
    var index = {};
    participants.forEach(function (participant) { index[participant.id] = new Set(); });
    for (var left = 0; left < participants.length; left++) {
      for (var right = left + 1; right < participants.length; right++) {
        if (!pairMayBeCompatible_(participants[left], participants[right], config)) continue;
        index[participants[left].id].add(participants[right].id);
        index[participants[right].id].add(participants[left].id);
      }
    }
    return index;
  }

  function scarcityOrder_(participants, compatibilityIndex) {
    return participants.slice().sort(function (left, right) {
      var leftCount = compatibilityIndex[left.id] ? compatibilityIndex[left.id].size : 0;
      var rightCount = compatibilityIndex[right.id] ? compatibilityIndex[right.id].size : 0;
      if (leftCount !== rightCount) return leftCount - rightCount;
      if (Boolean(left.requiredLanguage) !== Boolean(right.requiredLanguage)) return left.requiredLanguage ? -1 : 1;
      return 0; // Preserve the seeded shuffle for otherwise equal candidates.
    });
  }

  function seededShuffle_(values, seed) {
    var state = (Number(seed) || 1) >>> 0;
    var shuffled = values.slice();
    function random() {
      state = (1664525 * state + 1013904223) >>> 0;
      return state / 4294967296;
    }
    for (var index = shuffled.length - 1; index > 0; index--) {
      var swap = Math.floor(random() * (index + 1));
      var value = shuffled[index];
      shuffled[index] = shuffled[swap];
      shuffled[swap] = value;
    }
    return shuffled;
  }

  function candidateTriadsForAnchor_(anchor, remaining, config, compatibilityIndex) {
    var compatibleIds = compatibilityIndex[anchor.id] || new Set();
    var shortlist = remaining
      .filter(function (candidate) { return compatibleIds.has(candidate.id); })
      .map(function (candidate) {
        var commonCount = intersection_([anchor.acceptableLanguages || [], candidate.acceptableLanguages || []]).length;
        var slotCount = intersection_([anchor.availabilitySlots || [], candidate.availabilitySlots || []]).length;
        var chapterBonus = anchor.chapter === candidate.chapter ? 0 : 1;
        var peerBonus = 20 - 5 * Math.abs(anchor.credentialRank - candidate.credentialRank) - 5 * Math.abs(anchor.hoursRank - candidate.hoursRank);
        var countryBonus = anchor.countryGroup && candidate.countryGroup && anchor.countryGroup !== candidate.countryGroup ? 10 : 0;
        return { candidate: candidate, quick: commonCount * 5 + Math.min(20, slotCount / 20) + chapterBonus * 5 + countryBonus + peerBonus };
      })
      .sort(function (left, right) { return right.quick - left.quick || String(left.candidate.id).localeCompare(String(right.candidate.id)); })
      .slice(0, config.shortlistSize)
      .map(function (entry) { return entry.candidate; });

    var candidates = [];
    for (var left = 0; left < shortlist.length; left++) {
      for (var right = left + 1; right < shortlist.length; right++) {
        var triad = [anchor, shortlist[left], shortlist[right]];
        if (!passesHardConstraints(triad, config)) continue;
        candidates.push({ members: triad, score: scoreTriad(triad, config) });
      }
    }
    candidates.sort(function (a, b) {
      var countryOrder = config.weights.country ? b.score.subscores.country - a.score.subscores.country : 0;
      return countryOrder || b.score.total - a.score.total || a.members.map(function (member) { return member.id; }).join("|").localeCompare(b.members.map(function (member) { return member.id; }).join("|"));
    });
    return candidates;
  }

  function improveByMemberSwaps_(solution, config) {
    for (var pass = 0; pass < 2; pass++) {
      var improved = false;
      for (var leftIndex = 0; leftIndex < solution.triads.length; leftIndex++) {
        for (var rightIndex = leftIndex + 1; rightIndex < solution.triads.length; rightIndex++) {
          var leftTriad = solution.triads[leftIndex];
          var rightTriad = solution.triads[rightIndex];
          var baseScore = leftTriad.score.total + rightTriad.score.total;
          var accepted = false;
          for (var leftMember = 0; leftMember < 3 && !accepted; leftMember++) {
            for (var rightMember = 0; rightMember < 3 && !accepted; rightMember++) {
              var nextLeft = leftTriad.members.slice();
              var nextRight = rightTriad.members.slice();
              var swap = nextLeft[leftMember];
              nextLeft[leftMember] = nextRight[rightMember];
              nextRight[rightMember] = swap;
              if (!passesHardConstraints(nextLeft, config) || !passesHardConstraints(nextRight, config)) continue;
              var nextLeftScore = scoreTriad(nextLeft, config);
              var nextRightScore = scoreTriad(nextRight, config);
              var beforeExceptions = Number(leftTriad.score.distinctChapterCount < 3) + Number(rightTriad.score.distinctChapterCount < 3);
              var afterExceptions = Number(nextLeftScore.distinctChapterCount < 3) + Number(nextRightScore.distinctChapterCount < 3);
              if (config.weights.country && nextLeftScore.subscores.country + nextRightScore.subscores.country < leftTriad.score.subscores.country + rightTriad.score.subscores.country) continue;
              if (afterExceptions > beforeExceptions || nextLeftScore.total + nextRightScore.total <= baseScore + 0.1) continue;
              solution.triads[leftIndex] = { members: nextLeft, score: nextLeftScore };
              solution.triads[rightIndex] = { members: nextRight, score: nextRightScore };
              improved = true;
              accepted = true;
            }
          }
        }
      }
      if (!improved) break;
    }
    return solution;
  }

  function solveOnce_(regularParticipants, config, attempt, compatibilityIndex) {
    var shuffled = seededShuffle_(regularParticipants, config.seed + attempt);
    var remaining = scarcityOrder_(shuffled, compatibilityIndex);
    var triads = [];
    var unmatched = [];

    while (remaining.length) {
      var anchor = remaining.shift();
      var candidates = candidateTriadsForAnchor_(anchor, remaining, config, compatibilityIndex);
      if (!candidates.length) {
        unmatched.push(anchor);
        continue;
      }
      var selected = candidates[attempt % Math.min(3, candidates.length)];
      triads.push(selected);
      var selectedIds = selected.members.map(function (member) { return member.id; });
      remaining = remaining.filter(function (member) { return selectedIds.indexOf(member.id) === -1; });
    }
    return { triads: triads, unmatched: unmatched };
  }

  function fillWithBackups_(solution, backupParticipants, config, compatibilityIndex) {
    var unmatched = solution.unmatched.slice();
    var backups = scarcityOrder_(backupParticipants.filter(function (member) { return member.eligible && !member.manualHold; }), compatibilityIndex);
    var triads = solution.triads.slice();

    var stuckIds = {};
    while (unmatched.length && unmatched.length + backups.length >= 3) {
      var anchor = unmatched.shift();
      if (stuckIds[anchor.id]) { unmatched.push(anchor); break; }
      var pool = unmatched.concat(backups);
      var candidates = candidateTriadsForAnchor_(anchor, pool, config, compatibilityIndex);
      if (!candidates.length) {
        stuckIds[anchor.id] = true;
        unmatched.push(anchor);
        continue;
      }
      stuckIds = {};
      var selected = candidates[0];
      triads.push(selected);
      var ids = selected.members.map(function (member) { return member.id; });
      unmatched = unmatched.filter(function (member) { return ids.indexOf(member.id) === -1; });
      backups = backups.filter(function (member) { return ids.indexOf(member.id) === -1; });
    }
    return { triads: triads, unmatched: unmatched };
  }

  function solutionMetrics_(solution) {
    var regularMatched = solution.triads.reduce(function (sum, triad) {
      return sum + triad.members.filter(function (member) { return member.poolType !== "BACKUP_BOARD"; }).length;
    }, 0);
    var backupUsed = solution.triads.reduce(function (sum, triad) {
      return sum + triad.members.filter(function (member) { return member.poolType === "BACKUP_BOARD"; }).length;
    }, 0);
    var chapterExceptions = solution.triads.filter(function (triad) {
      return triad.score.distinctChapterCount < 3;
    }).length;
    var totalScore = solution.triads.reduce(function (sum, triad) { return sum + triad.score.total; }, 0);
    return {
      regularMatched: regularMatched,
      backupUsed: backupUsed,
      chapterExceptions: chapterExceptions,
      totalScore: Math.round(totalScore * 10) / 10
    };
  }

  function isBetterSolution_(candidate, best) {
    if (!best) return true;
    var left = solutionMetrics_(candidate);
    var right = solutionMetrics_(best);
    if (left.regularMatched !== right.regularMatched) return left.regularMatched > right.regularMatched;
    if (left.backupUsed !== right.backupUsed) return left.backupUsed < right.backupUsed;
    if (left.chapterExceptions !== right.chapterExceptions) return left.chapterExceptions < right.chapterExceptions;
    return left.totalScore > right.totalScore;
  }

  function matchParticipants(regularParticipants, backupParticipants, rawConfig) {
    var config = mergeConfig(rawConfig);
    var regular = regularParticipants.filter(function (member) { return member.eligible && !member.manualHold; });
    var backups = (backupParticipants || []).filter(function (member) { return member.eligible && !member.manualHold; });
    var compatibilityIndex = buildCompatibilityIndex_(regular.concat(backups), config);
    var best = null;
    for (var attempt = 0; attempt < config.restartCount; attempt++) {
      var solution = solveOnce_(regular, config, attempt, compatibilityIndex);
      solution = fillWithBackups_(solution, backups, config, compatibilityIndex);
      if (isBetterSolution_(solution, best)) best = solution;
    }
    best = best || { triads: [], unmatched: regular.slice() };
    improveByMemberSwaps_(best, config);
    best.metrics = solutionMetrics_(best);
    return best;
  }

  function proposeRematch(remainingMembers, candidates, rawConfig, limit) {
    var config = mergeConfig(rawConfig);
    var proposals = (candidates || [])
      .filter(function (candidate) { return candidate.eligible && !candidate.manualHold; })
      .map(function (candidate) { return [remainingMembers[0], remainingMembers[1], candidate]; })
      .filter(function (triad) { return passesHardConstraints(triad, config); })
      .map(function (triad) { return { members: triad, score: scoreTriad(triad, config) }; })
      .sort(function (left, right) {
        var leftBackup = left.members[2].poolType === "BACKUP_BOARD" ? 1 : 0;
        var rightBackup = right.members[2].poolType === "BACKUP_BOARD" ? 1 : 0;
        return leftBackup - rightBackup || right.score.total - left.score.total;
      });
    return proposals.slice(0, limit || 5);
  }

  return {
    DEFAULT_CONFIG: DEFAULT_CONFIG,
    commonLanguages: commonLanguages,
    sharedAvailabilitySlots: sharedAvailabilitySlots,
    maximumTimezoneSpread: maximumTimezoneSpread,
    passesHardConstraints: passesHardConstraints,
    scoreTriad: scoreTriad,
    peerExceptions: peerExceptions,
    matchParticipants: matchParticipants,
    proposeRematch: proposeRematch
  };
})();

var CacNormalizationCore = (function () {
  "use strict";

  var CHAPTER_ALIASES = {
    "the australasia chapter": "AU",
    "the bangkok chapter": "BKK",
    "the bengaluru chapter": "BLR",
    "the chennai chapter": "CHE",
    "the colombo chapter": "CMB",
    "the delhi ncr chapter": "DEL",
    "the hong kong chapter": "HKG",
    "the hyderabad chapter": "HYD",
    "the jakarta chapter": "JKT",
    "the japan chapter": "JPN",
    "the kolkata chapter": "CCU",
    "the korea chapter": "KOR",
    "the kyrgyzstan chapter": "KGZ",
    "the malaysia chapter": "MYS",
    "the mumbai chapter": "BOM",
    "the philippines chapter": "PHL",
    "the pune chapter": "PUN",
    "the singapore chapter": "SGP",
    "the taiwan chapter": "TWN",
    "the vietnam chapter": "VNM"
  };

  var WEEKDAYS = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 7
  };

  var LANGUAGE_PATTERNS = [
    { code: "id", pattern: /bahasa indonesia|indonesian/i },
    { code: "ms", pattern: /bahasa (malaysia|melayu)|\bmalay\b/i },
    { code: "yue", pattern: /cantonese/i },
    { code: "zh", pattern: /mandarin|putonghua|chinese|中文/i },
    { code: "vi", pattern: /vietnamese/i },
    { code: "ko", pattern: /korean/i },
    { code: "ja", pattern: /japanese/i },
    { code: "th", pattern: /thai/i },
    { code: "hi", pattern: /hindi/i },
    { code: "ta", pattern: /tamil/i },
    { code: "te", pattern: /telugu/i },
    { code: "mr", pattern: /marathi/i },
    { code: "tl", pattern: /tagalog|taglish/i },
    { code: "fr", pattern: /french/i },
    { code: "en", pattern: /english|englisj/i }
  ];

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function normalizeChapters(value) {
    var input = String(value || "").toLowerCase();
    return Object.keys(CHAPTER_ALIASES)
      .filter(function (alias) { return input.indexOf(alias) !== -1; })
      .map(function (alias) { return CHAPTER_ALIASES[alias]; });
  }

  function normalizeCredential(value) {
    var text = String(value || "").toUpperCase();
    if (text.indexOf("MCC") !== -1) return { level: "MCC", rank: 3 };
    if (text.indexOf("PCC") !== -1) return { level: "PCC", rank: 2 };
    if (text.indexOf("ACC") !== -1) return { level: "ACC", rank: 1 };
    return { level: "LEARNING", rank: 0 };
  }

  function normalizeHours(value) {
    var text = String(value || "").replace(/\s|,/g, "");
    if (/1000|\+/.test(text)) return { band: "1000_PLUS", rank: 3 };
    if (/500/.test(text)) return { band: "500_999", rank: 2 };
    if (/100/.test(text)) return { band: "100_499", rank: 1 };
    return { band: "1_99", rank: 0 };
  }

  function normalizeLanguages(value) {
    var source = String(value || "");
    var matches = LANGUAGE_PATTERNS.filter(function (entry) {
      return entry.pattern.test(source);
    }).map(function (entry) { return entry.code; });
    return Array.from(new Set(matches));
  }

  function languageMode(englishComfortAnswer) {
    var text = String(englishComfortAnswer || "").toLowerCase();
    if (text.indexOf("no,") === 0 || text.indexOf("local language only") !== -1) return "LOCAL_ONLY";
    if (text.indexOf("open to practicing") !== -1 || text.indexOf("shared local language") !== -1) return "LOCAL_PREFERRED";
    return "ENGLISH_OK";
  }

  function parseAvailability(value) {
    var source = String(value || "");
    var pattern = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s*(\d{2}:\d{2})\s*~\s*(\d{2}:\d{2})/gi;
    var windows = [];
    var match;
    while ((match = pattern.exec(source)) !== null) {
      windows.push({
        weekday: WEEKDAYS[match[1].toLowerCase()],
        localStartTime: match[2],
        localEndTime: match[3]
      });
    }
    return windows;
  }

  function fixedTimezoneForRawOffset(value) {
    var compact = String(value || "").replace(/\s/g, "").toUpperCase();
    if (compact.indexOf(",") !== -1) return null;
    var mappings = {
      "GMT+5": "Asia/Karachi",
      "GMT+5:30": "Asia/Kolkata",
      "GMT+6": "Asia/Dhaka",
      "GMT+7": "Asia/Bangkok",
      "GMT+8": "Asia/Singapore",
      "GMT+9": "Asia/Tokyo"
    };
    return mappings[compact] || null;
  }

  return {
    normalizeEmail: normalizeEmail,
    normalizeChapters: normalizeChapters,
    normalizeCredential: normalizeCredential,
    normalizeHours: normalizeHours,
    normalizeLanguages: normalizeLanguages,
    languageMode: languageMode,
    parseAvailability: parseAvailability,
    fixedTimezoneForRawOffset: fixedTimezoneForRawOffset
  };
})();

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

self.onmessage = function(event) { try { self.postMessage({ report: CacReviewMatching.run(event.data.input, event.data.overrides || {}, event.data.options || {}) }); } catch (error) { self.postMessage({error: String(error.message || error)}); } };
