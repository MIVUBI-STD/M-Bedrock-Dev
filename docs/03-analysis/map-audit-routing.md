# Map Audit Routing Guide

## Purpose

This file is a router only. It does not define a second audit workflow.

## Production entry

```text
audit <selected.mcworld>
→ runSelectedMapAudit()
```

## Canonical order

Use exactly this hierarchy:

1. [Master Selected-Map Audit Workflow](./master-selected-map-audit-workflow.md) — complete operator/AI work order.
2. [Mandatory Gameplay Audit Procedure](./mandatory-audit-procedure.md) — executable checkpoint contract.
3. [Map Audit Naming Contract](./map-audit-naming-contract.md) — canonical public terms.
4. Load specialist contracts only when the master workflow activates that concern.
5. [Current Validation](../07-operations/current-validation.md) — current proof limits and next proof target.

## Authority

```text
map-audit-pipeline.ts
→ mandatory-audit-procedure.ts
→ map-audit-admission.ts
→ scenario / analyzer evidence
→ PROVE
→ honesty
→ REPORT
```

Specialist documents, runtime tools, HTML/UI projections, Bug Report tooling, and engineering commands cannot authorize stage completion independently.

## Rule

If this file conflicts with the master workflow or executable source, this file loses. Link to the canonical owner instead of duplicating its procedure.
