# Golden Bug Tracker Publication Generator Contract

## Authorities

UI authority:
- Library source: `Bug_Tracker_Report_Golden_UI_Source_Locked.html`
- File ID: `file_0000000055948207b11dab3e70644642`

Data authority:
- `workspace/reports/approved-publication-dataset.json`

Registry authority:
- `workspace/project-registry.json`

Canonical issue authority:
- each registered `m-bedrock-bug-report/v2` referenced by Project Registry.

## Non-negotiable generation rule

The Golden UI source is a template/interaction authority only. Its embedded historical map/issue data, counts, statuses, and source labels MUST be discarded.

Generation must:
1. preserve the recovered HTML/CSS/JS visual and interaction contract;
2. rebuild map/level/issue content only from approved-publication-dataset.json;
3. calculate all summary/map/type/severity counts from that same in-memory dataset;
4. preserve maps with zero published issues and label them as no current source-proven issue, not bug-free;
5. render exact current World File and Drive Folder from registry authority;
6. preserve per-level separation for related multi-level games;
7. preserve map default-collapsed behavior;
8. preserve high-contrast active/open map and issue states;
9. preserve green fixed/verified state;
10. preserve Tester Notes and evidence attachments;
11. Export JSON from the same live report state;
12. Export HTML Snapshot from the same live report state, including notes/fixed state/embedded evidence;
13. never maintain a second manually edited issue/count dataset.

## Current canonical publication numbers

- Registered maps: 22
- Maps with published issues: 10
- Maps without published issues: 12
- Issues: 22
- BUG: 17
- DESIGN_MISMATCH: 5
- Blocker: 4
- Major: 15
- Minor: 3

These numbers are validation assertions only. The rendered UI must calculate them from the dataset and fail loudly if the calculation differs.

## Source-card contract

Every map/level source card must show:
- version;
- Drive Folder;
- exact World File;
- World File name.

Fingerprint and canonical report path remain available in exported JSON/context even when not visually prominent.

## Issue-card contract

Each published issue must preserve:
- ID;
- issueType;
- severity;
- title;
- problem;
- reproduction;
- observed;
- expected;
- suggestedFix/resolution;
- relevantCode/source context;
- mustPreserve;
- tester notes;
- evidence attachments;
- fixed/verified state.

## Validation gates

Publication is invalid if any are true:
- rendered issue count != dataset issue count;
- rendered BUG + DESIGN_MISMATCH != rendered total;
- severity totals != rendered total;
- duplicate issue ID;
- map lacks exact World File;
- registered canonical issue omitted;
- issue exists in HTML but not dataset;
- export JSON differs from live UI state;
- HTML snapshot loses notes/fixed/evidence state.

## Output names

Canonical outputs:
- `workspace/publication/Bug_Tracker_Report_Golden.html`
- `workspace/publication/Bug_Tracker_Report_Golden.json`

The JSON output is the complete report/context export, not a reduced summary.


## Developer Note publication contract

Developer Note authority:
- `workspace/reports/Dev-Notes.json`
- admission/coverage authority: `docs/03-analysis/developer-note-coverage.md`

Developer Notes are rendered as a third, separate report section:

```text
BUGS
DESIGN MISMATCHES
DEV NOTES
```

Each DEV NOTE must include:
- ID;
- plain-language title;
- category metadata;
- concrete problem/condition;
- developer impact or engineering consequence;
- affected scope;
- evidence;
- actionable correction.

Rules:
- DEV NOTE has no gameplay severity.
- DEV NOTE does not increase BUG, DESIGN_MISMATCH, or gameplay severity totals.
- summary separately shows Developer Notes and Total Actionable Items.
- DEV NOTE state, tester/developer notes, and attachments must survive JSON and HTML Snapshot export.
- a DEV NOTE promoted to BUG/DESIGN_MISMATCH must be removed from the DEV NOTE authority to prevent duplicate root causes.
- publication must fail on duplicate IDs across BUG, DESIGN_MISMATCH, and DEV NOTE.


