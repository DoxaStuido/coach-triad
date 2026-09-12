var CAC_SHEETS = {
  config: "00_Config",
  responses: "Form Responses 1",
  participants: "02_Participants",
  languages: "03_Languages",
  availability: "04_Availability",
  chapters: "05_Chapters",
  matchRuns: "06_Match_Runs",
  matchProposals: "07_Match_Proposals",
  triads: "08_Triads",
  triadMembers: "09_Triad_Members",
  sessions: "10_Sessions",
  cases: "11_Cases",
  auditLog: "12_Audit_Log"
};

function loadConfigMap_() {
  var rows = readSheetObjects_(CAC_SHEETS.config);
  return rows.reduce(function (config, row) {
    config[row.key] = parseConfigValue_(row.value, row.data_type);
    return config;
  }, {});
}

function parseConfigValue_(value, type) {
  if (type === "NUMBER") return Number(value);
  if (type === "BOOLEAN") return toBoolean_(value);
  if (type === "DATE" && value instanceof Date) return value;
  if (type === "DATE") return new Date(value + "T00:00:00Z");
  return value;
}

function loadMatchingConfig_() {
  var values = loadConfigMap_();
  var weights = {
    crossChapter: Number(values.weight_cross_chapter),
    credential: Number(values.weight_credential),
    coachingHours: Number(values.weight_coaching_hours),
    availability: Number(values.weight_availability),
    languagePreference: Number(values.weight_language_preference),
    avoidRepeatPairing: Number(values.weight_avoid_repeat_pairing)
  };
  var weightTotal = Object.keys(weights).reduce(function (sum, key) {
    return sum + weights[key];
  }, 0);
  if (weightTotal !== 100) {
    throw new Error("Matching weights must total 100; current total is " + weightTotal + ".");
  }
  return {
    maxTimezoneSpreadMinutes: Number(values.max_timezone_spread_minutes),
    minSharedSlots: 1,
    minimumMonthCoverage: Number(values.minimum_month_coverage),
    availabilityTargetSlots: Number(values.minimum_month_coverage) * 3,
    shortlistSize: Number(values.shortlist_size),
    restartCount: Number(values.restart_count),
    seed: Number(values.match_seed),
    weights: weights
  };
}
