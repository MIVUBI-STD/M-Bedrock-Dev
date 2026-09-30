# Bug Reports

This directory is the GitHub-persisted handoff workspace for completed ChatGPT audits.

Each report represents one audited map/version set and contains the confirmed bug list that will be repaired by one selected owner.

Canonical flow:

```text
AUDIT → REPORT → FIX
```

Store only canonical Bug Report V2 JSON here. Do not store raw analysis traces, caches, temporary evidence indexes, repair forms, verification records, or duplicate Markdown copies.

Recommended filename:

```text
<Map-Name>-v<Map-Version>-BugReport.json
```

Example:

```text
Beach-Bedwars-v1.0.4-BugReport.json
```

The report itself carries:

- Map Version
- Map Drive (required Google Drive URL)
- Base Version
- Tested Version
- Repair By
- confirmed Bugs
- per-bug Fixed checkbox
- developer-facing analysis and repair context

Git history is the change history. Do not duplicate revision logs inside report JSON.


Compatibility note:

- Bug Report V2 is the canonical persisted format.
- Bug Report V1 is read-only compatibility input for migration and must not be newly persisted.
- Canonical `Found By` values are `ai` or `tester`; combined evidence belongs in the evidence/analysis fields, not a third origin value.
