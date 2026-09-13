function collectPreflightIssues_() {
  var participants = loadMatchingParticipants_();
  var issues = [];

  participants.forEach(function (participant) {
    var source = participant.source;
    if (source.record_status && source.record_status !== "ACTIVE") return;
    if (source.match_status === "WITHDRAWN" || source.verification_status === "INELIGIBLE") return;
    function add(code, message, priority) {
      issues.push({
        code: code,
        message: message,
        priority: priority || "HIGH",
        participantId: participant.id,
        chapter: source.primary_chapter_code || ""
      });
    }

    if (!source.primary_chapter_code) add("PRIMARY_CHAPTER_MISSING", "Primary Chapter must be confirmed.");
    if (!toBoolean_(source.apac_residence_confirmed)) add("APAC_RESIDENCE_UNVERIFIED", "APAC residence must be confirmed.");
    if (!toBoolean_(source.commitment_confirmed)) add("COMMITMENT_DECLINED", "Participant did not confirm the programme commitment.", "URGENT");
    if (source.verification_status === "PENDING" || !source.verification_status) add("MEMBERSHIP_PENDING", "Chapter membership verification is incomplete.");
    if (source.verification_status === "RENEWAL_REQUIRED" && !toBoolean_(source.renewal_commitment)) add("RENEWAL_COMMITMENT_MISSING", "Membership renewal commitment is required.");
    if (!source.iana_timezone || source.timezone_verification_status === "NEEDS_REVIEW") add("TIMEZONE_NEEDS_REVIEW", "A verified IANA time zone is required.");
    if (participant.timezoneOffsets.length < 6) add("TIMEZONE_PROFILE_INCOMPLETE", "Six programme-month UTC offsets are required.");
    if (!participant.acceptableLanguages.length) add("LANGUAGE_UNRESOLVED", "At least one acceptable language is required.");
    if (source.language_mode === "LOCAL_ONLY" && !source.required_language_code) add("LOCAL_LANGUAGE_REQUIRED", "A local-language-only participant needs one required language code.", "URGENT");
    if (!participant.availabilitySlots.length) add("AVAILABILITY_UNRESOLVED", "At least one programme-wide canonical availability slot is required.");
  });
  return issues;
}

function createPreflightCases_(issues) {
  var existing = readSheetObjects_(CAC_SHEETS.cases).filter(function (row) {
    return row.status !== "RESOLVED";
  });
  var existingKeys = new Set(existing.map(function (row) {
    return [row.case_type, row.participant_id, row.resolution].join("|");
  }));
  var rows = issues.filter(function (issue) {
    return !existingKeys.has(["DATA", issue.participantId, issue.code].join("|"));
  }).map(function (issue) {
    return {
      case_id: newId_("CASE"),
      case_type: issue.code.indexOf("MEMBERSHIP") === 0 ? "ELIGIBILITY" : "DATA",
      participant_id: issue.participantId,
      triad_id: "",
      priority: issue.priority,
      status: "OPEN",
      owner_chapter_code: issue.chapter,
      owner_email: "",
      opened_at: new Date(),
      due_at: "",
      resolution: issue.code,
      replacement_participant_id: "",
      resolved_by: "",
      resolved_at: ""
    };
  });
  appendObjects_(CAC_SHEETS.cases, rows);
  return rows.length;
}

function runPreflight() {
  var issues = collectPreflightIssues_();
  var created = createPreflightCases_(issues);
  SpreadsheetApp.getUi().alert(
    "Preflight complete",
    issues.length + " issue(s) found; " + created + " new case(s) created.",
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  return issues;
}
