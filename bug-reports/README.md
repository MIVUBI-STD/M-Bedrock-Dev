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
- Base Version
- Tested Version
- Repair By
- confirmed Bugs
- per-bug Fixed checkbox
- developer-facing analysis and repair context

Git history is the change history. Do not duplicate revision logs inside report JSON.
