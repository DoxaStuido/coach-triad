function proposeRematchForTriad(triadId) {
  var activeMembers = readSheetObjects_(CAC_SHEETS.triadMembers).filter(function (row) {
    return row.triad_id === triadId && row.member_status === "ACTIVE";
  });
  if (activeMembers.length !== 2) {
    throw new Error("Rematch requires exactly two active members; found " + activeMembers.length + ".");
  }

  var participants = loadMatchingParticipants_();
  var byId = participants.reduce(function (map, participant) {
    map[participant.id] = participant;
    return map;
  }, {});
  var remaining = activeMembers.map(function (member) { return byId[member.participant_id]; });
  if (remaining.some(function (member) { return !member; })) throw new Error("Could not load both remaining participant profiles.");

  var activeIds = new Set(readSheetObjects_(CAC_SHEETS.triadMembers)
    .filter(function (row) { return row.member_status === "ACTIVE"; })
    .map(function (row) { return row.participant_id; }));
  var candidates = participants.filter(function (participant) {
    return !activeIds.has(participant.id) || participant.poolType === "BACKUP_BOARD";
  });
  var proposals = CacMatchingCore.proposeRematch(remaining, candidates, loadMatchingConfig_(), 5);

  var caseId = newId_("CASE");
  appendObjects_(CAC_SHEETS.cases, [{
    case_id: caseId,
    case_type: "REMATCH",
    participant_id: "",
    triad_id: triadId,
    priority: "HIGH",
    status: "IN_REVIEW",
    owner_chapter_code: "",
    owner_email: activeUserEmail_(),
    opened_at: new Date(),
    due_at: "",
    resolution: JSON.stringify(proposals.map(function (proposal) {
      return { candidate_id: proposal.members[2].id, score: proposal.score.total, exceptions: proposal.score.exceptions };
    })),
    replacement_participant_id: "",
    resolved_by: "",
    resolved_at: ""
  }]);
  appendAuditEvent_("REMATCH_OPTIONS_CREATED", "TRIAD", triadId, null, { caseId: caseId, count: proposals.length }, "", "Remaining members stayed locked; no membership was changed.");
  return proposals;
}

function promptForRematch() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.prompt("Preview rematch", "Enter the triad ID. This creates options only and does not change membership.", ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) return;
  var triadId = response.getResponseText().trim();
  var proposals = proposeRematchForTriad(triadId);
  ui.alert("Rematch preview", proposals.length + " option(s) saved to a REMATCH case for review.", ui.ButtonSet.OK);
}
