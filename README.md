# Coach a Coach

[English](README.md) | [繁體中文](README.zh-TW.md)

A peer-coaching triad matching tool and bilingual English / Traditional Chinese review workbench. The main workflow is:

**Original Excel → local CLI matching → private HTML with embedded data and engine → human review → JSON export for recordkeeping / resuming work.**

This is a locally runnable matching and review tool, not just a UI mockup; it is also not a live Google Sheets operations system. The web page currently **cannot upload Excel directly**: it only imports `cac-review-v2` JSON. JSON is the CLI output and subsequent handover format; you do not need to prepare a JSON roster yourself first.

The current rules version is `2026-09-13.v6`. See [Current matching and review rules](docs/matching-review-v2.md) for the complete, authoritative matching rules, scoring, exceptions, and data boundaries.

## Bilingual documentation index

| 文件 / Document | English | 繁體中文 |
| --- | --- | --- |
| 專案入門與交接 / Project setup and handover | [English](README.md) | [繁體中文](README.zh-TW.md) |
| 目前配對與複查規則（v6） / Current matching and review rules (v6) | [English](docs/matching-review-v2.md) | [繁體中文](docs/matching-review-v2.zh-TW.md) |
| 舊版 Google Sheets 與配對設計 / Legacy Google Sheets and matching design | [English](docs/google-sheet-and-matching-spec.md) | [繁體中文](docs/google-sheet-and-matching-spec.zh-TW.md) |
| 舊版 Apps Script 基礎架構 / Legacy Apps Script foundation | [English](apps-script/README.md) | [繁體中文](apps-script/README.zh-TW.md) |

**Documentation maintenance rule:** Future handover documents must have both English and Traditional Chinese versions, updated together. Use the canonical `.md` filename for English and insert `.zh-TW` before `.md` for Traditional Chinese. Preserve executable code, commands, identifiers, and runtime/data paths when translating; documentation links should point to the corresponding language, except in language navigation and bilingual indexes.

## 1. Setup

You need Node.js **>=22.13.0**, npm, and Python 3 with virtual-environment support. Run these commands from the project root:

```bash
npm ci
python3 -m venv .venv
.venv/bin/python -m pip install openpyxl
```

`openpyxl` is used only for local, read-only Excel parsing; `CAC_PYTHON` must point to a Python installation that has it installed. The commands below are for macOS / Linux and do not require activating the virtual environment first.

## 2. Generate a private review package from the original Excel

Keep the original `.xlsx` in a private location that will not be committed; the examples below use the ignored path `work/roster.xlsx`. The source must contain a `Participants` worksheet whose first 20 columns match the form fields and order checked by `scripts/read-roster.py`; this is not a general-purpose importer for arbitrary Excel files.

```bash
node scripts/sync-review-engine.mjs
CAC_PYTHON=.venv/bin/python npm run match:roster -- work/roster.xlsx outputs/private-review
```

Synchronize the engine first so that the generated HTML and CLI use the same core. The CLI reads Excel without changing the source; it preserves source row numbers and the file fingerprint, uses hashed IDs, and stops on duplicate identities. Hashed IDs **do not mean anonymization**: the review package still contains names, contact information, and necessary original answers.

The output directory must be a **subdirectory** of the Git-ignored `outputs/`; do not specify `outputs/` itself or any other location:

| File | Purpose |
| --- | --- |
| `outputs/private-review/review.html` | Embeds data, styles, and the matching engine; open it directly in a browser for private review, with no server required. |
| `outputs/private-review/matching-review.json` | Initial matching results; can be imported into the review page, but are not automatically updated by browser actions. |

The CLI also accepts a third positional argument, `[overrides.json]`, for corrections. This is neither a complete review export nor an entry point for resuming existing manual groups and review history. To resume work, import the most recent exported JSON into the web page.

### Independent result verifier

Run this on initial CLI results or on exported v6 review results after corrections have been applied:

```bash
node scripts/verify-matching-result.mjs outputs/private-review/matching-review.json work/roster.xlsx
```

The verifier does not call the matching core. It independently checks the source fingerprint, counts for all five statuses, duplicate group assignments, hard credential constraints, manual exclusions, manual decisions, and displayed common languages / 60-minute slots. It also scans public assets for email addresses from the source. Manual drafts may retain explicitly marked unresolved items, but must not treat unknown data as verified or approve groups with unresolved data issues. Complete any required recalculation before checking. A failure must not be skipped or treated as a pass, and a pass does not mean human review is complete.

## 3. Review and corrections

The workbench has five views:

| View | What to do |
| --- | --- |
| Draft triads | Check automatic / exception / manual groups, original answers, common languages, time-zone offset spreads, and monthly candidate slots; record review decisions. |
| Data holds | Unresolved membership, commitment, credential, language, time-zone, availability, or other inputs; these participants are not included in automatic matching. |
| Unmatched | Data is usable, but no group has been found yet; further human assessment is possible. |
| Unmatchable | The participant explicitly states that their permanent residence / work base is outside Asia-Pacific; this is not inferred from GMT or chapter. |
| Excluded | Members explicitly excluded by a coordinator; original data, reasons, and the audit trail are retained. |

Participants with data holds who have been added to manual drafts appear in those drafts and are no longer counted again under “Data holds”; their unresolved items are still retained.

- **Confirm / correct data**: The form supports city time zones, credentials, languages, and participation commitment, and requires the confirming person's name and supporting evidence. Corrections are stored separately from original answers and are not written back to Excel; not every field is editable here.
- **Explicitly re-run matching**: After saving corrections, click “Re-run with corrections” to update eligibility, slots, scores, and drafts. While recalculation is pending, reviews cannot be accepted and new manual groups cannot be created.
- **Exclude / restore**: A reviewer and reason are required, and the system records the time. Exclusion does not delete data; restoration does not clear existing data holds or an outside-Asia-Pacific residence determination, and matching must still be re-run. If a member belongs to a manual group, release that group before excluding them.
- **Review decisions**: Accepting, returning for rematch, or resetting a review requires a reviewer and explanation; acceptance additionally requires an acknowledgment. Acceptance means only that the review was accepted—**not publication, participant consent, or a booked session**.

Automatic matching first looks for standard groups with a maximum time-zone offset spread of 3 hours, then looks for coaching-hours and time-zone exceptions among the remaining participants; hard credential constraints are not relaxed. A common language and a continuous 60-minute candidate slot in every month of the six-month period remain mandatory for automatic matching. Displayed slots are candidates, not bookings. A single valid GMT / UTC fixed offset is used directly; an offset above +9 or a participant's chapter does not trigger a hold. Asia-Pacific includes Australia and New Zealand. Temporary travel / absence is flagged only as a risk and is not equivalent to permanent residence outside Asia-Pacific.

### Manual triad drafts

In “Manual matching,” select **3 distinct members** from “Data holds / Unmatched,” enter a reviewer and reason, and acknowledge that this is only an unverified planning draft. The system creates groups starting at `M-001` and stores the creation time and acknowledgment.

Manual matching does not allow every constraint to be bypassed:

- Already assigned, excluded, or permanently outside-Asia-Pacific participants cannot be selected; unresolved credentials must be corrected and matching re-run first.
- Both automatic and manual matching prohibit all-MCC and all-`LEARNING` (learning) groups, as well as MCC with ACC / `LEARNING` in the same group. MCC may only be grouped with PCC / MCC, and the group still cannot be all MCC; PCC may be grouped with ACC / `LEARNING`.
- Other unresolved inputs may remain in a planning draft, but the system does not fill in languages, time zones, or availability for unknown data. A manual draft's `score` / `subscores` are `null`; missing evidence is neither a zero score nor verification.
- A group cannot be approved while members have unresolved data holds or the draft has `MANUAL_*_UNVERIFIED` flags. Obtain evidence, correct the data, and re-run matching first; if corrections cause a credential conflict, release the manual group first.

Use “Manual matching → Manage active manual groups” to release a group; a reviewer and release reason are required. Released members return to Data holds or Unmatched according to their existing status and are not automatically rematched. Both creation and release remain in history, without changing other existing drafts or their reviews.

Re-running matching in the browser preserves valid manual groups and creation / release history, but may rearrange other drafts. Previous reviews move into history and do not carry over as approvals of the new results. Exact three-person combinations previously returned for rematch are excluded from subsequent browser re-runs.

## 4. Saving, handover, and upgrades

All web actions take place only in browser memory. **There is no automatic saving**, and the original HTML or JSON is not overwritten.

1. Before leaving or handing over, click “Export review” to download the current complete JSON.
2. Confirm that the file actually exists. If the download is blocked, copy the complete content from the dialog and save it separately as `.json`.
3. After checking, click “I confirmed it is saved / copied.” This button records your confirmation; it does not write a file for you.
4. Next time, click “Import results” on the review page and select the latest export to resume corrections, manual groups, and history. Give this file to the next coordinator as well, rather than merely sharing a web link.

**An old self-contained HTML file embeds the old engine and does not update when the code changes.** To apply new rules after an upgrade, save the JSON first, import it into the latest review page, and explicitly re-run matching. Simply reopening old HTML or importing old JSON does not automatically migrate / recalculate results. Re-running the CLI from Excel produces a new initial report and does not merge previous review history.

## Development and trying the tool without private data

```bash
npm run dev
```

Open the **actual URL printed by the terminal**; do not assume it is always `localhost:3000`. The home page loads the review workbench, which is also available at `/review/` under that URL. Click “Try fictional data” to try it without a real roster.

If you only need the static review page, use:

```bash
node scripts/sync-review-engine.mjs
python3 -m http.server 4173 --bind 127.0.0.1 --directory public
```

Open `http://127.0.0.1:4173/review/`. Serve only `public/`; do not serve HTTP from the project root, to avoid exposing private output.

Development commands:

```bash
npm run test:matching
npm test
npm run lint
```

- `test:matching` runs the Node tests in `apps-script/test/*.test.mjs`.
- `npm test` runs `npm run build` first, then `test:matching`; it is not just unit tests.
- `lint` runs ESLint; it does not include the independent result verifier or human / browser review.
- The pre-scripts for `dev` and `build` synchronize `public/review/engine.js`. The core sources are `apps-script/src/MatchingCore.gs`, `NormalizationCore.gs`, and `ReviewMatching.gs`; do not edit the generated engine file directly.

## Privacy and current limitations

- Roster data is processed by local Python / Node or the browser, not sent to external APIs, language models, or remote storage services. The review page blocks network data connections; loading the web assets themselves does not upload the roster.
- Public pages provide only an empty viewer and fictional demo. Private Excel, HTML, JSON, and exported records must not be placed in `public/`, deployment artifacts, Git, issues, or PRs. You must also keep downloaded JSON secure yourself; `.gitignore` is not encryption or access control.
- There is no multi-user synchronization, Excel / Google Sheets write-back, automatic group publication, or email sending. Matching produces deterministic heuristic drafts, does not guarantee a global optimum, and cannot replace human checks of free-text constraints and willingness to participate.
- [Google Sheets and matching design](docs/google-sheet-and-matching-spec.md) and [Apps Script foundation](apps-script/README.md) are earlier workbook / integration documents, not the authority for local v6 behavior or evidence of a completed production Google Sheets deployment.
- The original screen is preserved in the [mockup](public/mockup/index.html); open `/mockup/index.html` through the static server described above. It is separate from the current interactive review workflow at `/review/`.
