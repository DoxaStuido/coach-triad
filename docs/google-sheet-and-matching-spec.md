# Coach a Coach matching foundation

The confirmed-roster draft workflow now has a [v2 implementation contract](matching-review-v2.md).
This document describes the earlier operational workbook adapter. In v2, >3-hour
timezone candidates are allowed only in a separate, pending manual-exception pass.

This document is the implementation contract for the Google Sheet and its bound
Apps Script project. The workbook schema is machine-readable in
`schema/workbook-schema.json`.

## Delivery boundary

- `Form Responses 1` remains append-only and is never used as an operational
  workspace.
- Participant identity and contact details stay in the private operations
  workbook. Public review sites use fictional or de-identified data only.
- A draft matching run never sends email or publishes triads. Publication is a
  separate human-approved action.
- Matching results are versioned by `run_id`, `rules_version`, and deterministic
  `seed`.

## Data flow

1. Read all rows from `Form Responses 1`.
2. Normalize preferred email and merge duplicate submissions; the latest
   response supplies mutable form answers while all source row numbers remain in
   `source_row_numbers`.
3. Normalize Chapters, credential, coaching-hour bands, languages, time zones,
   and availability into the operational sheets.
4. Chapter coordinators verify membership, APAC residence, renewal commitment,
   and primary Chapter ownership.
5. Preflight creates cases for incomplete or conflicting data. Only records with
   `match_status=ELIGIBLE` enter a matching run.
6. Generate versioned proposals, review them, and publish approved proposals to
   `08_Triads` and `09_Triad_Members`.
7. Track sessions and resolve withdrawals or scheduling failures through
   `11_Cases` without overwriting membership history.

## Hard constraints

Every proposed triad must satisfy all of the following:

1. All three records are verified, APAC-resident, committed, and not on hold.
2. The three members share at least one acceptable coaching language.
3. Every `LOCAL_ONLY` requirement is present in the triad's common languages.
4. Maximum UTC-offset spread is no more than 180 minutes in every programme
   month.
5. At least one 60-minute recurring UTC slot remains common across all six
   programme months.
6. A participant belongs to no more than one active proposal or triad.

Language remains a hard constraint when it conflicts with Chapter diversity.
The proposal receives `LANGUAGE_OVERRIDES_CHAPTER` for human review.

## Soft scoring defaults

| Factor | Weight |
| --- | ---: |
| Cross-Chapter diversity | 30 |
| Credential similarity | 20 |
| Coaching-hour similarity | 20 |
| Additional shared availability | 15 |
| Preferred common language | 10 |
| Avoid prior pairing | 5 |

Weights live in `00_Config`; they must total 100 before a run can start.

## Time-zone handling

Fixed GMT selections are retained only as source evidence. Matching uses a
verified IANA time zone and a six-month offset profile. This is required for New
Zealand and Australia because a label such as `GMT+12` or `GMT+10` does not
identify daylight-saving behaviour or the participant's state/city.

Examples include `Pacific/Auckland`, `Australia/Sydney`,
`Australia/Brisbane`, and `Australia/Perth`.

## Matching strategy for fewer than 500 participants

The engine avoids enumerating all possible triplets. It builds a compatibility
index, starts with the most constrained participants, evaluates only a bounded
shortlist, and repeats deterministic greedy construction with different seeded
orders. A local swap pass improves the best result.

The objective is lexicographic:

1. No hard-constraint violations.
2. Maximize matched regular participants.
3. Minimize board backup usage.
4. Minimize Chapter-diversity exceptions.
5. Maximize total soft score.

## Rematching contract

- Keep the two remaining active members locked.
- Search unmatched regular participants first, then the board backup pool.
- Return the top five hard-compatible options for manual approval.
- Never break a healthy published triad automatically.
- Append new `09_Triad_Members` history and close the rematch case only after
  approval.

## Access control

A single Google Sheet does not provide true row-level permissions. Do not share
the master operations workbook broadly if Chapter coordinators should see only
their own members. Use either a coordinator-facing Apps Script web app filtered
by authenticated email or separate Chapter verification files synchronized back
to the master workbook.

## Definition of done for the live integration

- Import and normalization are idempotent and preserve verifier-maintained
  fields.
- Preflight identifies duplicates, missing membership data, non-APAC residence,
  multi-Chapter ownership, ambiguous time zones, and unresolved local-language
  requirements.
- Identical input, rules version, and seed reproduce the same draft proposals.
- Every published triad passes hard constraints and has an audit trail.
- Draft matching, rematching, and notification preview do not send messages.
- Publishing and notification sending require explicit human confirmation.
