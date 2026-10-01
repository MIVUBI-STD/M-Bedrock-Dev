# Bug Reports Agent Rules

Applies to persisted bug reports under `workspace/reports/`.

## Authority

- Only canonical Bug Report V2 JSON may be stored here.
- One report represents one audited map/version set.
- `map.mapVersion` and `map.drive` are mandatory; `map.drive` must be a Google Drive URL for the audited map artifact.
- One report has one `Repair By` value for the whole bug list.
- Per-bug `Fixed` is the only persisted repair-progress field.
- Git history is the revision history; do not duplicate revision logs in report JSON.

## Presentation

Persist canonical JSON; present a projection.

For ChatGPT or human-readable previews, follow `engine/packages/bug-report/PREVIEW.md`.

Default behavior:

- standard preview;
- open bugs only;
- Blocker → Major → Minor → Bug ID;
- show Issue before evidence;
- show Action only when canonical Suggested Fix exists;
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

- New reports use Bug Report V2 only. V1 exists solely for compatibility migration.
- Canonical bug origin is exactly `ai` or `tester`; do not introduce `both` / `ai+tester` in V2.
