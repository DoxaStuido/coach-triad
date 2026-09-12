var CAC_RESPONSE_FIELDS = {
  timestamp: "Timestamp",
  formEmail: "Email Address",
  fullName: "Full Name (First name and Last name)",
  preferredEmail: "What is your preferred email address?",
  membershipNo: "Your ICF membership number",
  membershipExpiry: "Membership expired date",
  chapter: "Which Chapter are you a member of?",
  credential: "What is your most recent ICF credential?",
  hours: "How many hours of coaching experience (paid or unpaid) do you have?",
  practiceAreas: "What are your main areas of coaching practice? Select all that apply or add others. ",
  timezone: "What time zone are you in?",
  availability: "Which days of the week are you available to meet for your coaching triad sessions? Select all that apply.",
  languages: "What are your language preferences for participating in this program? E.g. \"English\", \"Bahasa Indonesia + English\"",
  englishComfort: "Would you be comfortable participating in triads where the common coaching language is English? ",
  schedulingDetails: "Please list any other scheduling constraints that you may have. We will do our best to take these into consideration when placing you into a coaching triad.",
  commitment: "Thank you for your commitment to your professional development as an ICF member Coach. Before submitting your expression of interest, please consider all other personal and professional commitments."
};

function latestResponsesByEmail_(responses) {
  var grouped = {};
  responses.forEach(function (row) {
    var email = CacNormalizationCore.normalizeEmail(row[CAC_RESPONSE_FIELDS.preferredEmail] || row[CAC_RESPONSE_FIELDS.formEmail]);
    if (!email) return;
    var timestamp = row[CAC_RESPONSE_FIELDS.timestamp] instanceof Date ? row[CAC_RESPONSE_FIELDS.timestamp] : new Date(row[CAC_RESPONSE_FIELDS.timestamp]);
    if (!grouped[email]) grouped[email] = { rows: [], latest: row, latestTimestamp: timestamp };
    grouped[email].rows.push(row.__rowNumber);
    if (timestamp.getTime() >= grouped[email].latestTimestamp.getTime()) {
      grouped[email].latest = row;
      grouped[email].latestTimestamp = timestamp;
    }
  });
  return grouped;
}

function programmeMonthStarts_(configMap) {
  var start = configMap.program_start_date;
  var result = [];
  for (var month = 0; month < Number(configMap.minimum_month_coverage || 6); month++) {
    result.push(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + month, 1, 12, 0, 0)));
  }
  return result;
}

function timezoneOffsetMinutes_(instant, ianaTimezone) {
  var parts = Utilities.formatDate(instant, ianaTimezone, "yyyy-MM-dd-HH-mm").split("-").map(Number);
  var representedAsUtc = Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4]);
  return Math.round((representedAsUtc - instant.getTime()) / 60000);
}

function localDateTimeToUtc_(year, monthIndex, day, hour, minute, ianaTimezone) {
  var wallClock = Date.UTC(year, monthIndex, day, hour, minute);
  var guess = new Date(wallClock);
  for (var iteration = 0; iteration < 2; iteration++) {
    guess = new Date(wallClock - timezoneOffsetMinutes_(guess, ianaTimezone) * 60000);
  }
  return guess;
}

function firstIsoWeekdayInMonth_(monthStart, isoWeekday) {
  var firstJsWeekday = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), 1)).getUTCDay();
  var firstIsoWeekday = firstJsWeekday === 0 ? 7 : firstJsWeekday;
  return 1 + ((isoWeekday - firstIsoWeekday + 7) % 7);
}

function timeParts_(value) {
  var parts = String(value).split(":").map(Number);
  return { hour: parts[0], minute: parts[1] };
}

function canonicalSlotKeys_(window, ianaTimezone, monthStarts, slotMinutes) {
  if (!ianaTimezone) return [];
  var startParts = timeParts_(window.localStartTime);
  var endParts = timeParts_(window.localEndTime);
  var keys = [];
  monthStarts.forEach(function (monthStart, monthIndex) {
    var day = firstIsoWeekdayInMonth_(monthStart, window.weekday);
    var startUtc = localDateTimeToUtc_(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), day, startParts.hour, startParts.minute, ianaTimezone);
    var endUtc = localDateTimeToUtc_(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), day, endParts.hour, endParts.minute, ianaTimezone);
    for (var cursor = startUtc.getTime(); cursor + slotMinutes * 60000 <= endUtc.getTime(); cursor += 30 * 60000) {
      var instant = new Date(cursor);
      var jsWeekday = instant.getUTCDay();
      var isoWeekday = jsWeekday === 0 ? 7 : jsWeekday;
      var minutes = instant.getUTCHours() * 60 + instant.getUTCMinutes();
      var hh = String(Math.floor(minutes / 60)).padStart(2, "0");
      var mm = String(minutes % 60).padStart(2, "0");
      keys.push("M" + (monthIndex + 1) + ":" + isoWeekday + ":" + hh + mm + "Z");
    }
  });
  return keys;
}

function buildParticipantRecord_(group, existing, configMap, languageRows, availabilityRows) {
  var row = group.latest;
  var credential = CacNormalizationCore.normalizeCredential(row[CAC_RESPONSE_FIELDS.credential]);
  var hours = CacNormalizationCore.normalizeHours(row[CAC_RESPONSE_FIELDS.hours]);
  var chapters = CacNormalizationCore.normalizeChapters(row[CAC_RESPONSE_FIELDS.chapter]);
  var mode = CacNormalizationCore.languageMode(row[CAC_RESPONSE_FIELDS.englishComfort]);
  var fixedTimezone = chapters.indexOf("AU") === -1 ? CacNormalizationCore.fixedTimezoneForRawOffset(row[CAC_RESPONSE_FIELDS.timezone]) : null;
  var ianaTimezone = existing && existing.iana_timezone ? existing.iana_timezone : fixedTimezone || "";
  var timezoneStatus = existing && existing.timezone_verification_status === "VERIFIED" ? "VERIFIED" : fixedTimezone ? "AUTO" : "NEEDS_REVIEW";
  var monthStarts = programmeMonthStarts_(configMap);
  var offsets = ianaTimezone ? monthStarts.map(function (monthStart) { return timezoneOffsetMinutes_(monthStart, ianaTimezone); }) : [];
  var verificationStatus = existing && existing.verification_status ? existing.verification_status : "PENDING";
  var renewalCommitment = existing ? toBoolean_(existing.renewal_commitment) : false;
  var verificationOkay = verificationStatus === "VERIFIED" || (verificationStatus === "RENEWAL_REQUIRED" && renewalCommitment);
  var primaryChapter = existing && existing.primary_chapter_code ? existing.primary_chapter_code : chapters.length === 1 ? chapters[0] : "";
  var acceptableLanguageCodes = languageRows.filter(function (item) { return toBoolean_(item.acceptable); }).map(function (item) { return item.language_code; });
  var requiredLanguage = existing && existing.required_language_code ? existing.required_language_code :
    mode === "LOCAL_ONLY" && acceptableLanguageCodes.length === 1 && acceptableLanguageCodes[0] !== "en" ? acceptableLanguageCodes[0] : "";
  var commitment = String(row[CAC_RESPONSE_FIELDS.commitment] || "").toLowerCase() === "yes";
  var hasSixMonthSlots = new Set(availabilityRows.flatMap(function (item) {
    return parsePipeList_(item.canonical_slot_keys).map(function (key) { return key.split(":")[0]; });
  })).size >= Number(configMap.minimum_month_coverage || 6);
  var eligible = verificationOkay &&
    toBoolean_(existing && existing.apac_residence_confirmed) &&
    commitment &&
    timezoneStatus !== "NEEDS_REVIEW" &&
    languageRows.some(function (item) { return toBoolean_(item.acceptable); }) &&
    (mode !== "LOCAL_ONLY" || requiredLanguage) &&
    hasSixMonthSlots &&
    !(existing && toBoolean_(existing.manual_hold));

  return {
    participant_id: existing ? existing.participant_id : newId_("P"),
    source_row_numbers: group.rows.sort(function (a, b) { return a - b; }).join("|"),
    latest_response_at: group.latestTimestamp,
    full_name: row[CAC_RESPONSE_FIELDS.fullName],
    preferred_email: CacNormalizationCore.normalizeEmail(row[CAC_RESPONSE_FIELDS.preferredEmail] || row[CAC_RESPONSE_FIELDS.formEmail]),
    form_email: CacNormalizationCore.normalizeEmail(row[CAC_RESPONSE_FIELDS.formEmail]),
    icf_membership_no: existing && verificationStatus !== "PENDING" ? existing.icf_membership_no : row[CAC_RESPONSE_FIELDS.membershipNo],
    membership_expiry_date: existing && verificationStatus !== "PENDING" ? existing.membership_expiry_date : row[CAC_RESPONSE_FIELDS.membershipExpiry],
    primary_chapter_code: primaryChapter,
    additional_chapter_codes: chapters.filter(function (chapter) { return chapter !== primaryChapter; }).join("|"),
    residence_country_code: existing ? existing.residence_country_code : "",
    residence_city: existing ? existing.residence_city : "",
    apac_residence_confirmed: existing ? toBoolean_(existing.apac_residence_confirmed) : false,
    credential_level: credential.level,
    credential_rank: credential.rank,
    coaching_hours_band: hours.band,
    hours_rank: hours.rank,
    practice_areas_raw: row[CAC_RESPONSE_FIELDS.practiceAreas],
    timezone_raw: row[CAC_RESPONSE_FIELDS.timezone],
    iana_timezone: ianaTimezone,
    programme_utc_offsets: offsets.join("|"),
    timezone_verification_status: timezoneStatus,
    language_mode: mode,
    required_language_code: requiredLanguage,
    scheduling_constraints_raw: row[CAC_RESPONSE_FIELDS.schedulingDetails],
    commitment_confirmed: commitment,
    renewal_commitment: renewalCommitment,
    verification_status: verificationStatus,
    verification_note: existing ? existing.verification_note : "",
    verified_by: existing ? existing.verified_by : "",
    verified_at: existing ? existing.verified_at : "",
    pool_type: existing && existing.pool_type ? existing.pool_type : "REGULAR",
    match_status: existing && existing.record_status === "WITHDRAWN" ? "WITHDRAWN" : eligible ? "ELIGIBLE" : "HOLD",
    manual_hold: existing ? toBoolean_(existing.manual_hold) : false,
    hold_reason: existing ? existing.hold_reason : "",
    prior_partner_ids: existing ? existing.prior_partner_ids : "",
    record_status: existing && existing.record_status ? existing.record_status : "ACTIVE",
    updated_at: new Date()
  };
}

function syncLatestFormResponses() {
  var lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    var configMap = loadConfigMap_();
    var responses = readSheetObjects_(CAC_SHEETS.responses);
    var grouped = latestResponsesByEmail_(responses);
    var existingParticipants = readSheetObjects_(CAC_SHEETS.participants);
    var existingByEmail = existingParticipants.reduce(function (map, participant) {
      map[CacNormalizationCore.normalizeEmail(participant.preferred_email)] = participant;
      return map;
    }, {});
    var existingLanguages = readSheetObjects_(CAC_SHEETS.languages);
    var existingAvailability = readSheetObjects_(CAC_SHEETS.availability);
    var existingReviewedLanguages = existingLanguages.reduce(function (map, row) {
      if (row.normalization_status !== "REVIEWED") return map;
      (map[row.participant_id] || (map[row.participant_id] = [])).push(row);
      return map;
    }, {});
    var monthStarts = programmeMonthStarts_(configMap);
    var participants = [];
    var languages = [];
    var availability = [];

    Object.keys(grouped).sort().forEach(function (email) {
      var group = grouped[email];
      var existing = existingByEmail[email] || null;
      var participantId = existing ? existing.participant_id : newId_("P");
      var source = group.latest;
      var normalizedLanguageCodes = CacNormalizationCore.normalizeLanguages(source[CAC_RESPONSE_FIELDS.languages]);
      var reviewedLanguages = existingReviewedLanguages[participantId] || [];
      var participantLanguages = reviewedLanguages.length ? reviewedLanguages : normalizedLanguageCodes.map(function (code, index) {
        return {
          participant_id: participantId,
          language_code: code,
          language_name: code,
          preference_rank: index + 1,
          acceptable: true,
          required: false,
          source_text: source[CAC_RESPONSE_FIELDS.languages],
          normalization_status: normalizedLanguageCodes.length ? "AUTO" : "NEEDS_REVIEW",
          reviewed_by: "",
          reviewed_at: ""
        };
      });
      var sourceMode = CacNormalizationCore.languageMode(source[CAC_RESPONSE_FIELDS.englishComfort]);
      if (!reviewedLanguages.length && sourceMode === "LOCAL_ONLY" && participantLanguages.length === 1 && participantLanguages[0].language_code !== "en") {
        participantLanguages[0].required = true;
      }
      languages = languages.concat(participantLanguages);

      var sourceChapters = CacNormalizationCore.normalizeChapters(source[CAC_RESPONSE_FIELDS.chapter]);
      var fixedTimezone = sourceChapters.indexOf("AU") === -1 ? CacNormalizationCore.fixedTimezoneForRawOffset(source[CAC_RESPONSE_FIELDS.timezone]) : null;
      var ianaTimezone = existing && existing.iana_timezone ? existing.iana_timezone : fixedTimezone || "";
      var windows = CacNormalizationCore.parseAvailability(source[CAC_RESPONSE_FIELDS.availability]);
      var participantAvailability = windows.map(function (window, index) {
        return {
          availability_id: "AVL-" + participantId.slice(-8) + "-" + String(index + 1).padStart(2, "0"),
          participant_id: participantId,
          weekday: window.weekday,
          local_start_time: window.localStartTime,
          local_end_time: window.localEndTime,
          iana_timezone: ianaTimezone,
          canonical_slot_keys: canonicalSlotKeys_(window, ianaTimezone, monthStarts, Number(configMap.min_shared_slot_minutes || 60)).join("|"),
          source_text: source[CAC_RESPONSE_FIELDS.availability],
          normalization_status: ianaTimezone && windows.length ? "AUTO" : "NEEDS_REVIEW"
        };
      });
      availability = availability.concat(participantAvailability);

      var participant = buildParticipantRecord_(group, existing, configMap, participantLanguages, participantAvailability);
      participant.participant_id = participantId;
      participants.push(participant);
    });

    existingParticipants.forEach(function (participant) {
      var email = CacNormalizationCore.normalizeEmail(participant.preferred_email);
      if (!grouped[email]) {
        participants.push(participant);
        languages = languages.concat(existingLanguages.filter(function (row) { return row.participant_id === participant.participant_id; }));
        availability = availability.concat(existingAvailability.filter(function (row) { return row.participant_id === participant.participant_id; }));
      }
    });

    replaceSheetObjects_(CAC_SHEETS.participants, participants);
    replaceSheetObjects_(CAC_SHEETS.languages, languages);
    replaceSheetObjects_(CAC_SHEETS.availability, availability);
    appendAuditEvent_("FORM_RESPONSES_SYNCED", "WORKBOOK", SpreadsheetApp.getActiveSpreadsheet().getId(), null, {
      sourceRows: responses.length,
      canonicalParticipants: participants.length,
      duplicateRowsMerged: Math.max(0, responses.length - Object.keys(grouped).length)
    }, "", "Verifier-maintained participant fields were preserved.");
    SpreadsheetApp.getUi().alert(
      "Sync complete",
      responses.length + " response row(s) became " + Object.keys(grouped).length + " canonical participant(s).",
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return { responseCount: responses.length, participantCount: Object.keys(grouped).length };
  } finally {
    lock.releaseLock();
  }
}
