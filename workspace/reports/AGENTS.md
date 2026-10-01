# Bug Reports Agent Rules

Applies to persisted bug reports under `workspace/reports/`.

## Authority

- Only canonical Bug Report V2 JSON may be stored here.
- This directory is the persisted current-state authority for bug reports. Drive exports, UI state, spreadsheets, PDFs, and legacy QA material are non-authoritative projections or inputs.
- Record the current audited map version first. Do not backfill missing historical reports merely for completeness, and never invent old bug state.
- One report represents one audited map/version set.
- `map.mapVersion` and `map.drive` are mandatory; `map.drive` must be a Google Drive URL for the audited map artifact.
- One report has one `Repair By` value for the whole bug list.
- Per-bug `Fixed` is the only persisted repair-progress field.
- New bugs always start `Fixed: false`. Only the engine-owned verified retest/completion path may set `Fixed: true`; generic saves/imports/reconciliation must not close bugs.
- Git history is the revision history; do not duplicate revision logs in report JSON.

## Presentation

Persist canonical JSON; present a projection.

For AI Bug Trigger authoring, use the evidence-bound compiler in `engine/packages/bug-report/src/bug-trigger.ts`. New reports must pass `report-readiness.ts` and `COPY.md` / `copy-quality.ts`. For ChatGPT or human-readable previews, follow `engine/packages/bug-report/PREVIEW.md`.

Default behavior:

- standard preview;
- open bugs only;
- Blocker → Major → Minor → Bug ID;
- show Issue first;
- show Bug Trigger (In-Game) directly after Issue;
- show Solution only when canonical Suggested Fix exists;
- omit empty sections;
- keep internal diagnostics out of normal preview.

Do not persist preview Markdown as a second report artifact.

## Do not store

- raw map artifacts;
- private user files;
- AI chain-of-thought or scratch reasoning;
- caches or derived indexes;
- verification records;
- repair forms;
- duplicate Markdown copies of the same report.

Use `engine/packages/bug-report/` as the semantic owner of the report contract.

- New reports use Bug Report V2 only and must be handoff-ready. V1 exists solely for compatibility migration.
- Canonical bug origin is exactly `ai` or `tester`; do not introduce `both` / `ai+tester` in V2.
