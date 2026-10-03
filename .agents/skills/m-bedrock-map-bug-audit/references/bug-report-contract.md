# Production Bug Report Contract

Canonical report semantics are owned by:

- `../../../../docs/03-analysis/gameplay-bug-report-v2.md`
- `../../../../docs/03-analysis/map-audit-report-v2-schema.md`
- `../../../schemas/map-audit-output-v2.schema.json`

HTML presentation has two scopes:

- Map Audit Report (all PROVEN + NEED_VALIDATION findings) → `../../../../tooling/bug-report-documents/render.ts`
- Approved Bug Report V2 ledger → `../../../../docs/03-analysis/templates/bug-report-v2-html-layout.md`

The Map Audit renderer must preserve unresolved findings; the Bug Report V2 layout must not be used as a substitute for the complete audit surface.

## Skill rule

Do not redefine the report shape here. Follow the canonical files above so the skill, schema, documentation, and rendered report cannot drift.

Tester-facing reproduction remains player/world language. Technical implementation details belong in Evidence.
