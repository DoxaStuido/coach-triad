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
