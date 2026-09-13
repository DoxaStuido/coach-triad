import fs from "node:fs/promises";
const files = ["MatchingCore", "NormalizationCore", "ReviewMatching"];
const source = "/* global Utilities */\n" + (await Promise.all(files.map(name => fs.readFile(new URL(`../apps-script/src/${name}.gs`, import.meta.url), "utf8")))).join("\n");
await fs.writeFile(new URL("../public/review/engine.js", import.meta.url), source + '\nself.onmessage = function(event) { try { self.postMessage({ report: CacReviewMatching.run(event.data.input, event.data.overrides || {}, event.data.options || {}) }); } catch (error) { self.postMessage({error: String(error.message || error)}); } };\n');
