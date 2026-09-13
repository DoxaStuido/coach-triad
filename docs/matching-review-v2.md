# Matching Rules and Review Operations

[English](matching-review-v2.md) | [繁體中文](matching-review-v2.zh-TW.md)

Current rules version: `2026-09-13.v6`. The result interchange format remains `cac-review-v2`; these are two different kinds of version.

This document describes the currently runnable **Excel → Node matching → browser review** workflow. The early Google Sheets adapter has not yet been integrated and tested in the actual Sheets environment for this workflow; passing local tests must not be treated as a completed Sheets deployment. See the [README](../README.md) for installation and startup instructions.

## 1. Input and Data Boundaries

- The source roster is the `Participants` worksheet in Excel. The reader checks 20 column-header prefixes in order; it is not a general-purpose Excel field-mapping tool.
- Original row numbers are preserved, and stable hashed IDs are generated from the preferred email (falling back to the form email when blank). Duplicate identities must be resolved first; the reader does not merge them on its own.
- The source Excel file is not modified. Browser corrections are stored separately in `overrides`, with correction history retained.
- Unnecessary fields such as membership numbers, membership expiry dates, and personal-growth narratives are not exported to the review package. Results still contain names, contact details, and original scheduling notes, and must be kept private.
- The source roster and the multi-sheet operations template are not interchangeable inputs. The operations template's `Form Responses 1` / `02_Participants` are not the `Participants` worksheet required by this reader.

## 2. Five Mutually Exclusive States

| State | Meaning |
| --- | --- |
| Draft triads | Assigned to an automatic or manual triad; this does not mean approved or published. |
| Data holds | Not yet grouped, with unresolved data issues such as credentials, commitment, language, or time-zone offset. |
| Unmatched | Currently available for matching, but the search did not produce a suitable triad; this does not mean ineligible to participate. |
| Unmatchable | The participant explicitly states that their usual residence / work base is outside this program's Asia-Pacific scope. |
| Excluded | A coordinator has explicitly recorded a manual exclusion decision. |

Manual exclusion takes precedence over the regional determination, which takes precedence over data pending confirmation. No one is counted twice:

```text
total = assigned + unmatched + held + unmatchable + excluded
matchingPool = assigned + unmatched
```

A manual draft may include someone with issues still pending confirmation. That person counts toward `assigned`, not also toward the ungrouped `held` count; their original `blockingIssues` remain in the member data and must not be treated as confirmed data.

## 3. Requirements for Automatic Matching

Before automatic matching, each participant must:

- Have confirmed membership and an explicit commitment to participate.
- Have neither a manual exclusion nor a determination of residence outside Asia-Pacific.
- Have recognizable Chapter, coaching credential, coaching-hours band, accepted-language, and time-zone data.
- Have computable availability.

Every automatic draft must:

- Contain exactly three distinct participants, with each person appearing in at most one group.
- Have a language accepted by all three members and satisfy each person's local-language restriction.
- Have at least one shared, continuous 60-minute candidate slot in every month of the six-month program.
- Follow the hard credential-combination constraints below; later exception stages cannot relax them either.

A rejected complete three-person combination is excluded from subsequent automatic recalculations; this does not prohibit any two of those people from sharing a group again.

## 4. MCC, PCC, ACC, In learning

The internal comparison levels are `LEARNING=0`, `ACC=1`, `PCC=2`, and `MCC=3`. This is only an ordering for matching, not a certification of ability.

### Combination Constraints That Cannot Be Relaxed

1. Three MCC participants must not share a group.
2. Three In learning participants must not share a group.
3. If a group contains an MCC, its other members must be MCC or PCC only.
4. PCC participants may be grouped with ACC and/or In learning participants.
5. All-PCC, all-ACC, and mixed ACC / In learning groups remain allowed.

| Example combination | Credential combination allowed? |
| --- | --- |
| MCC + MCC + PCC | Allowed |
| MCC + PCC + PCC | Allowed |
| MCC + MCC + MCC | Prohibited |
| MCC + PCC + ACC | Prohibited; PCC does not bridge credential levels. |
| MCC + PCC + In learning | Prohibited |
| PCC + ACC + In learning | Allowed |
| PCC + In learning + In learning | Allowed |
| ACC + In learning + In learning | Allowed |
| In learning + In learning + In learning | Prohibited |

“Allowed” still requires all other automatic-matching conditions to be satisfied. The old “credentials differ by at most one level” rule is no longer a general matching filter; credential similarity still affects scoring.

If an answer contains multiple credentials, such as `PCC, In learning process`, it is marked `CREDENTIAL_UNRESOLVED` and must be confirmed before the participant can join either an automatic or a manual group.

## 5. Coaching Hours and Exception Stages

The hours bands are `1–99`, `100–499`, `500–999`, and `1,000+`, corresponding to levels 0–3.

The standard stage requires the highest and lowest hours bands to differ by at most one level, with a maximum time-zone difference of 180 minutes. Only unmatched participants move to the next stage:

| Stage | Hours-band difference | Time-zone difference limit |
| --- | --- | --- |
| `STANDARD` | At most one level | 180 minutes |
| `PEER_EXCEPTION` | Relaxed | 180 minutes |
| `TIMEZONE_EXCEPTION` | At most one level | 1,440 minutes |
| `COMBINED_EXCEPTION` | Relaxed | 1,440 minutes |

`PEER_EXCEPTION` currently refers to the coaching-hours gap; it does not relax the MCC credential constraints. Exception stages do not bypass the automatic-matching requirements for a shared language, commitment to participate, or shared 60-minute slots either. Exceptions remain drafts requiring human review, not automatic approvals.

## 6. GMT, Availability, and Travel

### Time-Zone Calculation

- A single valid fixed GMT / UTC offset is used directly, including Australasia's `GMT+8`, `GMT+10`, and `GMT+12`.
- City confirmation is no longer required solely because of Chapter or an offset above `+9`; fixed offsets are not automatically converted into cities or adjusted for daylight saving time.
- Existing coordinator-confirmed IANA time-zone corrections still take precedence, with offsets calculated for the actual dates within the program period.
- Invalid formats or multiple offsets, such as `GMT+6, GMT+7`, still require confirmation.
- Notes mentioning a different GMT offset receive `TIMEZONE_NOTE_REVIEW`; they do not automatically replace or block the otherwise valid submitted offset.

The program period is fixed at **2026-10-01 to 2027-03-31**. The engine considers candidate start times every 30 minutes, checking for continuous 60-minute availability and month-by-month intersections. Displayed times are candidates, not agreed meetings.

### Travel and Short-Term Absence

Travel, short overseas stays, and inability to attend during a particular period are now marked `TRAVEL_RISK`:

- They do not block matching.
- This free text is not used to subtract dates or alter the submitted recurring availability.
- Potential risks of the match failing are displayed for the individual and the group, so that the three members can confirm arrangements.

Ordinary client appointments, membership renewal dates, or daylight saving explanations should not be treated as travel merely because they mention a month.

**Other free-text restrictions, such as working hours, have not yet been fully converted into availability rules.** `SCHEDULING_REVIEW` means a note awaits interpretation, not that a conflict has been confirmed; the engine cannot guarantee that every free-text requirement is satisfied.

## 7. Asia-Pacific Eligibility, Chapters, and India Grouping

The program continues to use an Asia-Pacific scope that includes Australia and New Zealand.

- When participants explicitly state that their usual residence / base is outside Asia-Pacific, they are marked `OUTSIDE_APAC_RESIDENCE`, and their original `residenceEvidence` is displayed in the “Unmatchable” section.
- Residence is not inferred from GMT, Chapter, nationality, or client location.
- A permanent base in the United States with a short visit to Asia is still outside the region; a short visit to Europe followed by a return to Australia is marked only as a travel risk.
- Detection uses conservative rules for self-reported statements and place names, not full natural-language understanding. Negation, past residence, or travel alone is not treated as evidence of a permanent base; unrecognized or ambiguous text is left for human review.

Chapter geography is used only for group diversity. India's Bengaluru, Chennai, Delhi NCR, Hyderabad, Kolkata, and Mumbai (as well as Pune in the dictionary) are all classified as `IN`.

Cross-country / region and cross-Chapter grouping are **priorities, not absolute bans on same-country / region or same-Chapter groups**. Such groups may still occur when there are insufficient alternatives, and their diversity warnings need review; shared-language, availability, or hard credential constraints are not bypassed to achieve cross-region grouping.

## 8. Languages, Scoring, and Search

- Languages follow explicit form answers; English is not added for anyone who did not agree to it.
- An answer of only `Chinese` is not automatically interpreted as Mandarin or Cantonese; English may still be used if explicitly accepted separately.
- A local-language restriction must be satisfied by all three members, not merely by finding one other person who speaks that language.

| Scoring factor | Weight |
| --- | ---: |
| Credential similarity | 25 |
| Coaching-hours similarity | 20 |
| Country / region diversity | 20 |
| Additional shared availability | 15 |
| Chapter diversity | 10 |
| Language preference | 5 |
| Time-zone proximity | 5 |

Credential / hours-band differences of 0, 1, 2, and 3 correspond to similarity scores of 100, 70, 30, and 0. Scores are not approval thresholds.

Candidate selection additionally prioritizes cross-country / region grouping; complete solutions are compared first by the number of people matched, then by backup use, Chapter exceptions, and total score. The search uses a fixed seed, a bounded candidate set, multiple greedy searches, and local swaps. Results are reproducible but not guaranteed to be globally optimal.

This roster supplies neither past matching history nor a board backup list, so neither is invented. Professional specialties are available for human review, not currently a matching weight for which other conditions are sacrificed.

The six-month role rotation gives each person two turns each as coach, coachee, and observer; manual groups use the same rotation table. MCC participants are not permanently assigned as coach, nor In learning participants as coachee; this is a peer exchange, not a fixed mentor–mentee arrangement.

## 9. Manual Exclusion and Restoration

- From a participant's details or a member card, select “Exclude participant” and enter the reviewer and reason.
- The decision is stored separately as `overrides[id].exclusion = {excluded,reviewer,reason,at}`. Original data is not deleted, and correction history retains the before-and-after values.
- Exclusion immediately removes the person from active drafts on screen; the other affected members await recalculation. Statistics are marked as requiring recalculation, and approval is disabled.
- Restoring participation does not automatically resolve data issues or the regional determination. Anyone meeting the outside-region criteria returns to “Unmatchable”.
- A person in a manual group must have that manual group released first; exclusion must not be used to silently break up a preserved group.

## 10. Manual Matching

Select exactly three people from “Data holds” or “Unmatched”, enter the reviewer and reason, and acknowledge that this is a planning draft.

- Do not take people who are already matched, excluded, or unmatchable.
- Unresolved credentials must be confirmed first; hard credential constraints, including MCC restrictions, cannot be bypassed.
- Other pending issues may temporarily remain in a manual draft, but manual matching does not establish participant consent or confirm the data.
- Creating or releasing a manual group changes only that group, preserving other drafts and review records.
- Manual groups use IDs such as `M-001`, which are not reused after release. `manualMatches` stores active decisions, while `manualMatchHistory` stores creation and release events.
- Manual-group members are reserved before automatic recalculation; the same manual ID and membership are retained after JSON export / import.
- Manual groups have no calculated quality score. Shared language, time-zone difference, and availability display only evidence-backed values; unknown values use `null` / “Not verified”, not fabricated slots.
- Approval is prohibited while members still have data issues or any `MANUAL_*_UNVERIFIED` is present. Corrections can be made from member cards, followed by recalculation to refresh the evidence, without first releasing the manual group.
- Management and release controls remain available while recalculation is pending or records conflict. “Release manual group” requires a reviewer and reason, and members return to Data holds or Unmatched according to their status.

`summary.manualTriads` is separate from automatic exception-group counts. Starting again from Excel creates a fresh run; to retain manual decisions, you must resume from the exported JSON.

## 11. Review, Persistence, and Current Limitations

- Approval requires a reviewer, notes, and verification checkboxes; approval is still not publication or sending email.
- After data changes, recalculation must be explicitly triggered; an old review cannot be directly applied to new results. History is still retained.
- Current operations are stored only in browser memory. Before closing, you must export JSON and confirm that it has been downloaded or copied.
- HTML is not automatically rewritten; reopening the same HTML loads its original embedded snapshot. To resume, import the latest JSON.
- A standalone HTML file includes the engine from when it was generated. After a rules update, you must use the new page and explicitly recalculate; refreshing an old HTML file does not upgrade it.
- There is no multi-user synchronization, autosave, formal publication, notification sending, or Google Sheets write-back for the current roster.

## 12. Verification

`npm test` runs the build and matching tests; `npm run lint` runs ESLint. Tests should protect credential combinations, time-zone / travel / regional classification, manual exclusion, manual group creation and release, preservation across recalculation, unknown evidence, and mutually exclusive accounting.

`node scripts/verify-matching-result.mjs <result.json> <original.xlsx>` independently checks source fingerprints, counts, identity uniqueness, hard credential constraints, exclusion / regional restrictions, and the shared languages and 60-minute slots shown. Unconfirmed issues in manual drafts must not be treated as passing automatic eligibility; groups with unconfirmed evidence cannot be approved. The verifier also scans public assets for accidentally included email addresses from the source roster.

Successful tests and verification do not mean that all free-text requirements are satisfied, that deployment is complete, or that real participants have given consent.
