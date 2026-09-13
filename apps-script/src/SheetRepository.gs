function getRequiredSheet_(sheetName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error("Missing required sheet: " + sheetName);
  return sheet;
}

function readSheetObjects_(sheetName) {
  var sheet = getRequiredSheet_(sheetName);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(String);
  return values.slice(1)
    .filter(function (row) { return row.some(function (value) { return value !== "" && value !== null; }); })
    .map(function (row, index) {
      return headers.reduce(function (object, header, column) {
        object[header] = row[column];
        object.__rowNumber = index + 2;
        return object;
      }, {});
    });
}

function appendObjects_(sheetName, objects) {
  if (!objects.length) return;
  var sheet = getRequiredSheet_(sheetName);
  var lastColumn = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(String);
  var rows = objects.map(function (object) {
    return headers.map(function (header) {
      return Object.prototype.hasOwnProperty.call(object, header) ? object[header] : "";
    });
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
}

function replaceSheetObjects_(sheetName, objects) {
  var sheet = getRequiredSheet_(sheetName);
  var lastColumn = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(String);
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, lastColumn).clearContent();
  }
  if (!objects.length) return;
  var rows = objects.map(function (object) {
    return headers.map(function (header) {
      return Object.prototype.hasOwnProperty.call(object, header) ? object[header] : "";
    });
  });
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

function updateObjectById_(sheetName, idField, id, changes) {
  var sheet = getRequiredSheet_(sheetName);
  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(String);
  var idColumn = headers.indexOf(idField);
  if (idColumn === -1) throw new Error("Missing ID field " + idField + " in " + sheetName);
  var rowIndex = values.findIndex(function (row, index) {
    return index > 0 && String(row[idColumn]) === String(id);
  });
  if (rowIndex === -1) throw new Error("Could not find " + id + " in " + sheetName);
  Object.keys(changes).forEach(function (field) {
    var column = headers.indexOf(field);
    if (column !== -1) sheet.getRange(rowIndex + 1, column + 1).setValue(changes[field]);
  });
}

function activeUserEmail_() {
  return Session.getActiveUser().getEmail() || "unknown@local";
}

function newId_(prefix) {
  return prefix + "-" + Utilities.getUuid().replace(/-/g, "").slice(0, 12).toUpperCase();
}

function toBoolean_(value) {
  return value === true || String(value).toUpperCase() === "TRUE" || String(value).toUpperCase() === "YES";
}

function parsePipeList_(value) {
  return String(value || "").split("|").map(function (part) { return part.trim(); }).filter(Boolean);
}

function parseNumberList_(value) {
  return parsePipeList_(value).map(Number).filter(function (number) { return Number.isFinite(number); });
}

function loadMatchingParticipants_() {
  var participants = readSheetObjects_(CAC_SHEETS.participants);
  var languages = readSheetObjects_(CAC_SHEETS.languages);
  var availability = readSheetObjects_(CAC_SHEETS.availability);
  var languagesByParticipant = {};
  var availabilityByParticipant = {};

  languages.forEach(function (row) {
    if (!toBoolean_(row.acceptable)) return;
    var bucket = languagesByParticipant[row.participant_id] || [];
    bucket.push({ code: row.language_code, rank: Number(row.preference_rank) || 99 });
    languagesByParticipant[row.participant_id] = bucket;
  });

  availability.forEach(function (row) {
    var bucket = availabilityByParticipant[row.participant_id] || [];
    bucket = bucket.concat(parsePipeList_(row.canonical_slot_keys));
    availabilityByParticipant[row.participant_id] = Array.from(new Set(bucket));
  });

  return participants.map(function (row) {
    var languageRows = (languagesByParticipant[row.participant_id] || []).sort(function (a, b) { return a.rank - b.rank; });
    var verificationOkay = row.verification_status === "VERIFIED" ||
      (row.verification_status === "RENEWAL_REQUIRED" && toBoolean_(row.renewal_commitment));
    var eligible = row.match_status === "ELIGIBLE" &&
      verificationOkay &&
      toBoolean_(row.apac_residence_confirmed) &&
      toBoolean_(row.commitment_confirmed);
    return {
      id: row.participant_id,
      chapter: row.primary_chapter_code,
      credentialRank: Number(row.credential_rank),
      hoursRank: Number(row.hours_rank),
      acceptableLanguages: languageRows.map(function (language) { return language.code; }),
      languagePreferences: languageRows.map(function (language) { return language.code; }),
      requiredLanguage: row.required_language_code || null,
      timezoneOffsets: parseNumberList_(row.programme_utc_offsets),
      availabilitySlots: availabilityByParticipant[row.participant_id] || [],
      priorPartnerIds: parsePipeList_(row.prior_partner_ids),
      poolType: row.pool_type || "REGULAR",
      eligible: eligible,
      manualHold: toBoolean_(row.manual_hold),
      source: row
    };
  });
}

function appendAuditEvent_(action, entityType, entityId, beforeState, afterState, runId, note) {
  appendObjects_(CAC_SHEETS.auditLog, [{
    event_id: newId_("EVT"),
    timestamp: new Date(),
    actor: activeUserEmail_(),
    action: action,
    entity_type: entityType,
    entity_id: entityId,
    before_json: beforeState ? JSON.stringify(beforeState) : "",
    after_json: afterState ? JSON.stringify(afterState) : "",
    run_id: runId || "",
    note: note || ""
  }]);
}
