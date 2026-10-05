# Map Audit Schema Migration

> Historical migration note only. This file is not a production workflow, report authority, or current schema definition.

## Current authority

Use:

- [Master Selected-Map Audit Workflow](./master-selected-map-audit-workflow.md) for execution order;
- [Map Audit Report V2 Schema](./map-audit-report-v2-schema.md) for the human-facing audit contract;
- [Map Audit Naming Contract](./map-audit-naming-contract.md) for canonical field/status names;
- `.agents/schemas/map-audit-output-v2.schema.json` for structural validation.

## Historical purpose

This migration introduced the transition from bug-candidate-only output toward a gameplay-aware audit model with:

- game design context;
- player-flow stages;
- state transitions;
- multi-arena context;
- explicit BUG / DESIGN_MISMATCH findings.

Those concepts are now owned by the current V2 contract above.

## Rule

Do not copy field lists, status vocabulary, or workflow order from this historical note into current code. Git history owns superseded migration detail.