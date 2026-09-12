# Matching review v2 — 12 September 2026

## Current runnable path

`scripts/read-roster.py` reads the confirmed `Participants` worksheet without modifying it. It validates the 20 source headers, preserves Excel row numbers (including blank timestamps), uses preferred email for stable hashed participant IDs, and fails on duplicate identities. Membership numbers and development narratives are not exported to the review package.

`scripts/run-matching.mjs` loads `MatchingCore.gs`, `NormalizationCore.gs`, and `ReviewMatching.gs` in a local Node context. The same sources are bundled by `scripts/sync-review-engine.mjs` for the browser worker. No external API or language model processes the roster.

```sh
CAC_PYTHON=/path/to/bundled/python3 node scripts/run-matching.mjs /private/path/roster.xlsx outputs/private-review
node scripts/verify-matching-result.mjs outputs/private-review/matching-review.json /private/path/roster.xlsx
```

The result and self-contained `review.html` contain private participant information. They stay under ignored `outputs/`, outside both Git and website deployment assets. The public review page is an empty viewer with a fictional demo. Importing a result reads the file into browser memory, not a server. Export saves the current review and its history locally; there is no multi-user synchronization or Google Sheet write-back.

## Policy and provisional interpretation

- The source membership checkbox is the Chapter coordinator's confirmation. A separate participation `No`, ambiguous credential, unresolved local language, ambiguous timezone, or changing-location note creates a data hold, not an ineligibility judgment.
- Australasia and GMT offsets above +9 need a confirmed city timezone. A fixed GMT response alone does not establish Australian state or New Zealand DST rules. Overrides record coordinator, timestamp and evidence. Temporary relocation requires dated timezone support and remains held in this version; a single-city override cannot clear it.
- For unambiguous fixed-offset inputs, use the submitted offset as source evidence, not an inferred city. For confirmed IANA cities, compute offsets for every programme day. Candidate windows are actual UTC dates from 1 October 2026 through 31 March 2027, with a continuous 60-minute duration checked at 30-minute starting intervals. Every month must have a shared candidate. Special free-text restrictions still require human checking; displayed times are candidates, not bookings.
- Generic `Chinese` is not automatically Mandarin or Cantonese. English is accepted only when the source explicitly accepts English; local-only participants cannot be matched through English.
- Country/region currently uses Chapter geography as a clearly labelled proxy, because the confirmed export has no residence-country column. It is not verified residence or nationality. Indian Chapters share `IN`. A confirmed Australasia city distinguishes Australia and New Zealand. All proxy use is flagged for review.
- Standard pass: timezone spread <=180 minutes, credential gap <=1 and coaching-hour band gap <=1. Both experience limits are conservative preferences implemented as a first-pass filter, not eligibility rules.
- Only the remaining unmatched pool enters later passes: peer-gap exceptions within 180 minutes, then timezone exceptions, then combined exceptions. Common language, consent-to-participate and 60-minute availability are never relaxed. Exception candidates are not approved automatically. No board backups were supplied, inferred, or invented.
- Scores are for comparison, not A/B/C approval thresholds. V2 weights: country/region 20, Chapter 10, credential 25, hours 20, additional availability 15, language preference 5, timezone proximity 5. Country diversity is preferred in candidate selection. Practice areas are displayed for human review, not used to sacrifice experience compatibility. Prior-pairing history is unavailable in the confirmed export.
- The heuristic is deterministic for identical input and seed but not an exhaustive optimum. A result reflects the currently usable pool; clearing held participants may improve the complete cohort's groupings.

## Review workflow

1. Import the private JSON, or open the private self-contained HTML.
2. Review triads, source rows, original notes, common language, timezone spread and monthly time candidates.
3. Confirm data holds using the correction form where supported. Corrections remain separate from original answers. Re-run explicitly to apply them.
4. Record acceptance or rejection with reviewer, note and acknowledgement. Acceptance means **review accepted, not published**. Rejected exact triplets are excluded on subsequent browser re-runs.
5. Export before closing. The export dialog starts a JSON download and provides a copyable JSON fallback for browsers that block downloads. The unsaved-change warning is cleared only after the reviewer explicitly confirms saving or copying. Nothing saves automatically; no email is sent. Re-running moves previous decisions to history and clears approval for new proposals. There are no published/active assignments in this standalone draft workflow; the legacy rematching contract must still protect active triads when live integration is added.

## Google Sheets boundary

The `.gs` core is shared, but the existing 15-sheet operational adapter/menu is still the earlier foundation and has not been connected to this confirmed roster or deployed/tested on a live Apps Script project. Use the v2 Node/browser path for these results. Do not represent legacy `runDraftMatching()` or a local green test as a live Sheet integration. The legacy configuration weights and operational workbook schema have not been migrated automatically.

## Verification

Run `node --test apps-script/test/*.test.mjs`. Tests cover timezone exceptions, credential exceptions, common-language intersection, a 30-minute-overlap rejection, actual-date DST, source holds, deterministic proposals, role rotation and rejected-triplet exclusion. The independent result checker verifies source fingerprint, participant accounting and displayed UTC candidates against each person's submitted fixed-offset local windows; it deliberately fails instead of claiming independent IANA validation for later corrected-city datasets. Public assets are scanned for real email addresses. Browser tests use fictional data for approval actions, then inspect the real result without approving it.
