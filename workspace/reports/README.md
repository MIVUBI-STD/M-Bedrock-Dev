# Bug Reports

This directory is the GitHub-persisted canonical state workspace for the **approved Bug Report V2 ledger only**. It is not the complete Map Audit Report or the authority for unresolved audit findings.

Each new report represents one audited map/version set and must be tester-facing, handoff-ready, and canonical Bug Report V2. Active recording is current-version-first: do not create historical reports solely to fill missing coverage.

Canonical flow:

```text
MAP AUDIT REPORT
→ approved PROVEN reportable issues
→ PROPOSED ISSUE SET
→ CHAT REVIEW
→ APPROVED ISSUE SET
→ BUG REPORT V2
→ HTML
→ REPAIR
```

Store only canonical Bug Report V2 JSON here. This directory is the persisted bug-state authority; UI state, derived HTML, Drive copies, spreadsheets, and external QA notes are not parallel authorities. Do not store raw analysis traces, caches, temporary evidence indexes, repair forms, verification records, or duplicate Markdown copies.


Report policy is owned by `engine/packages/bug-report/`:

- `bug-trigger.ts` — evidence-bound AI Bug Trigger authoring;
- `report-readiness.ts` — tester-readiness gate;
- `COPY.md` / `copy-quality.ts` — wording quality;
- `PREVIEW.md` — human / ChatGPT presentation;
- Bug Report V2 — only persisted report format.

Canonical repository directory:

```text
workspace/reports/
```

Recommended filename:

```text
<Map-Name>-v<Map-Version>-BugReport.json
```

Example:

```text
Beach-Bedwars-v1.0.4-BugReport.json
```

The canonical report may carry:

- Map Version
- Map Drive (required Google Drive URL)
- Base Version
- Tested Version
- Repair By
- confirmed Issues with explicit `issueType` (`BUG` or `DESIGN_MISMATCH`)
- per-issue Fixed state
- Bug Trigger (In-Game)
- tester-facing Issue and supported Solution
- Repair Detail fields for on-demand technical work

Git history is the change history. Do not duplicate revision logs inside report JSON.


Compatibility note:

- Bug Report V2 is the canonical persisted format.
- Bug Report V1 is read-only compatibility input for migration and must not be newly persisted.
- Canonical `Found By` values are `ai` or `tester`; combined evidence belongs in the evidence/analysis fields, not a third origin value.
- Canonical `issueType` values are `BUG` or `DESIGN_MISMATCH`. Legacy V2 entries without `issueType` are interpreted as `BUG`.


Handoff rule:

- normal user-facing creation requires an Approved Issue Set from explicit chat review;
- every proposed Blocker/Major issue must be approve, reject, or resolved from needs-discussion before publication;
- rejected items never enter canonical Bug Report V2;
- if no issues are approved, no report is created;
- new reports must pass tester readiness and copy quality before being created in this workspace;
- schema-valid legacy reports may remain for compatibility, but must not be treated as handoff-ready automatically;
- normal human presentation separates **Bugs** and **Design Mismatches**, then follows `Issue → Bug Trigger (In-Game) → Solution` within each section.


Repair completion rule:

- `fixed: true` is written only after verified repair completion;
- generic report saves must not close an open issue;
- completion requires current passing validation with evidence;
- stale validation cannot be used to close an issue;
- Git history remains the persisted change history; do not add a second repair-status log.


Must Preserve verification:

- free-text `mustPreserve` remains reader/repair context and is not converted into guessed invariant IDs;
- verified completion supplies explicit preservation invariant IDs when Must Preserve requirements exist;
- those invariants must be current and covered by the selected passing validation runs;
- the selected runs must satisfy their scenarios' required proof levels.
