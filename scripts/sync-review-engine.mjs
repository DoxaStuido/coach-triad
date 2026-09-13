import fs from "node:fs/promises";
const files = ["MatchingCore", "NormalizationCore", "ReviewMatching"];
const source = "/* global Utilities */\n" + (await Promise.all(files.map(name => fs.readFile(new URL(`../apps-script/src/${name}.gs`, import.meta.url), "utf8")))).join("\n");
const dispatcher = `
self.onmessage = function(event) {
  try {
    var data = event.data, report;
    if (data.action === "manual-create") report = CacReviewMatching.addManualMatch(data.report, data.manualMatch);
    else if (data.action === "manual-release") report = CacReviewMatching.removeManualMatch(data.report, data.manualMatchId, data.decision);
    else if (!data.action || data.action === "run") report = CacReviewMatching.run(data.input, data.overrides || {}, data.options || {});
    else throw new Error("Unknown worker action: " + data.action);
    self.postMessage({ report: report });
  } catch (error) { self.postMessage({ error: String(error.message || error) }); }
};
`;
await fs.writeFile(new URL("../public/review/engine.js", import.meta.url), source + dispatcher);
