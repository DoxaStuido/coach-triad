function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Coach a Coach")
    .addItem("1. Sync latest Form responses", "syncLatestFormResponses")
    .addItem("2. Run preflight", "runPreflight")
    .addItem("3. Run draft matching", "runDraftMatching")
    .addSeparator()
    .addItem("Preview rematch", "promptForRematch")
    .addToUi();
}
