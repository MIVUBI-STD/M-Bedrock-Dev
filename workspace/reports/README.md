# Bug Reports

This directory is the GitHub-persisted handoff workspace for completed audits.

Each new report represents one audited map/version set and must be tester-facing, handoff-ready, and canonical Bug Report V2.

Canonical flow:

```text
AUDIT → BUG REPORT → REPAIR
```

Store only canonical Bug Report V2 JSON here. Do not store raw analysis traces, caches, temporary evidence indexes, repair forms, verification records, or duplicate Markdown copies.


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
- confirmed Bugs
- per-bug Fixed state
- Bug Trigger (In-Game)
- tester-facing Issue and supported Solution
- Repair Detail fields for on-demand technical work

Git history is the change history. Do not duplicate revision logs inside report JSON.


Compatibility note:

- Bug Report V2 is the canonical persisted format.
- Bug Report V1 is read-only compatibility input for migration and must not be newly persisted.
- Canonical `Found By` values are `ai` or `tester`; combined evidence belongs in the evidence/analysis fields, not a third origin value.


Handoff rule:

- new reports must pass tester readiness and copy quality before being created in this workspace;
- schema-valid legacy reports may remain for compatibility, but must not be treated as handoff-ready automatically;
- normal human presentation follows `Bug → Issue → Bug Trigger (In-Game) → Solution`.


Repair completion rule:

- `fixed: true` is written only after verified repair completion;
- generic report saves must not close an open bug;
- completion requires current passing validation with evidence;
- stale validation cannot be used to close a bug;
- Git history remains the persisted change history; do not add a second repair-status log.
