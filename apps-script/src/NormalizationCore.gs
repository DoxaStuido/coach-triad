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
