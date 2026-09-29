# Bug Reports Agent Rules

Applies to persisted bug reports under `bug-reports/`.

## Authority

- Only canonical Bug Report V2 JSON may be stored here.
- One report represents one audited map/version set.
- One report has one `Repair By` value for the whole bug list.
- Per-bug `Fixed` is the only persisted repair-progress field.
- Git history is the revision history; do not duplicate revision logs in report JSON.

## Do not store

- raw map artifacts;
- private user files;
- AI chain-of-thought or scratch reasoning;
- caches or derived indexes;
- verification records;
- repair forms;
- duplicate Markdown copies of the same report.

Use `packages/bug-report/` as the semantic owner of the report contract.
