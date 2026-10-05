# Publication

Derived human-facing publication outputs.

This directory may contain:
- standalone HTML reports/workspaces;
- exported JSON snapshots;
- validation receipts for generated publication;
- map-level derived HTML outputs.

## Authority

```text
canonical report/project inputs
→ publication generation
→ workspace/publication/
```

Files here are **derived**. They do not own:
- current Bug Report V2 state;
- selected-map audit truth;
- project lifecycle state;
- historical reliability knowledge.

Canonical current bug-report state remains in `workspace/reports/`.

## Regeneration rule

A publication artifact is stale when its recorded source fingerprint/input set no longer matches the canonical source inputs.

Do not manually edit generated publication output and feed it back into canonical report state.

## Intermediate dataset

`publication-dataset.json` is the current derived publication aggregate used by the existing publication bundle. It is generated from canonical report/project/developer-note inputs and is not a report authority.


If a publication dataset/aggregate is retained, treat it as generated build input only. It must not become a second live report database.