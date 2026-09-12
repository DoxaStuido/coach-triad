function runDraftMatching() {
  var lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  var runId = newId_("RUN");
  var startedAt = new Date();

  try {
    var config = loadMatchingConfig_();
    var preflightIssues = collectPreflightIssues_();
    if (preflightIssues.length) {
      createPreflightCases_(preflightIssues);
      throw new Error("Preflight has " + preflightIssues.length + " unresolved issue(s). Resolve them before matching.");
    }

    var participants = loadMatchingParticipants_();
    var regular = participants.filter(function (participant) {
      return participant.poolType !== "BACKUP_BOARD" && participant.eligible && !participant.manualHold;
    });
    var backups = participants.filter(function (participant) {
      return participant.poolType === "BACKUP_BOARD" && participant.eligible && !participant.manualHold;
    });
    var configRows = readSheetObjects_(CAC_SHEETS.config);
    var rulesVersion = configRows.length ? String(configRows[0].rules_version || "v1.0") : "v1.0";

    appendObjects_(CAC_SHEETS.matchRuns, [{
      run_id: runId,
      rules_version: rulesVersion,
      seed: config.seed,
      started_at: startedAt,
      started_by: activeUserEmail_(),
      eligible_count: regular.length,
      triad_count: 0,
      unmatched_count: 0,
      backup_used_count: 0,
      average_score: 0,
      status: "RUNNING",
      published_at: "",
      notes: ""
    }]);

    var solution = CacMatchingCore.matchParticipants(regular, backups, config);
    var proposals = solution.triads.map(function (proposal, index) {
      var score = proposal.score;
      return {
        run_id: runId,
        proposal_id: "PROP-" + runId.slice(-6) + "-" + String(index + 1).padStart(3, "0"),
        member_1_id: proposal.members[0].id,
        member_2_id: proposal.members[1].id,
        member_3_id: proposal.members[2].id,
        common_language_code: score.commonLanguage,
        shared_slots_count: score.sharedSlots.length,
        timezone_spread_max_minutes: score.timezoneSpreadMinutes,
        distinct_chapter_count: score.distinctChapterCount,
        credential_gap: score.credentialGap,
        hours_gap: score.hoursGap,
        score_cross_chapter: score.subscores.crossChapter,
        score_credential: score.subscores.credential,
        score_hours: score.subscores.coachingHours,
        score_availability: score.subscores.availability,
        score_language: score.subscores.languagePreference,
        score_prior_pairing: score.subscores.avoidRepeatPairing,
        total_score: score.total,
        exception_codes: score.exceptions.join("|"),
        review_status: "PENDING",
        review_note: "",
        reviewed_by: "",
        reviewed_at: ""
      };
    });
    appendObjects_(CAC_SHEETS.matchProposals, proposals);

    var average = proposals.length ? proposals.reduce(function (sum, proposal) { return sum + proposal.total_score; }, 0) / proposals.length : 0;
    updateObjectById_(CAC_SHEETS.matchRuns, "run_id", runId, {
      triad_count: proposals.length,
      unmatched_count: solution.unmatched.length,
      backup_used_count: solution.metrics.backupUsed,
      average_score: Math.round(average * 10) / 10,
      status: "DRAFT"
    });
    appendAuditEvent_("DRAFT_MATCH_CREATED", "MATCH_RUN", runId, null, solution.metrics, runId, "No triads were published and no notifications were sent.");

    SpreadsheetApp.getUi().alert(
      "Draft matching complete",
      proposals.length + " triad proposal(s), " + solution.unmatched.length + " unmatched regular participant(s). Review 07_Match_Proposals before publishing.",
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return solution;
  } catch (error) {
    var existing = readSheetObjects_(CAC_SHEETS.matchRuns).some(function (run) { return run.run_id === runId; });
    if (existing) updateObjectById_(CAC_SHEETS.matchRuns, "run_id", runId, { status: "FAILED", notes: String(error.message || error) });
    throw error;
  } finally {
    lock.releaseLock();
  }
}
