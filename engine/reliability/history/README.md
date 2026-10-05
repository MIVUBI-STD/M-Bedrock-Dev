# Reliability Search Campaign History

Append-only evidence records from reliability-search campaigns.

Each record is a standalone JSON file. Do not edit old records to make new results look cleaner.

Recommended naming:

```text
<timestamp>-<campaign-id>.json
```

A record should include:

- schemaVersion;
- campaign id;
- optional map id;
- optional Minecraft version;
- artifact/reliability fingerprints when available;
- mutation/search summary;
- blindspot tasks;
- optional minimized reproduction metadata.

History is longitudinal evidence, not semantic source authority.

## Audit execution history

Selected-map audit execution records are grouped under:

```text
history/audit-runs/
```

This includes full-map, unseen, regression, prospective, manual, post-upgrade, runtime-reduction, artifact-inventory, and evaluation snapshots.

Historical runs are evidence/history only. They do not define current gameplay truth, current planning, or current report state.

## History classes

History contains two intentionally different classes:

### Campaign records

Top-level JSON campaign records use the reliability campaign identity/schema and are verified strictly.

### Archived execution/snapshot history

Subdirectories such as:

```text
audit-runs/
repository-operations/
```

contain historical execution snapshots, migration records, audit runs, or superseded operational evidence. Their original payload shape is preserved for forensic/reference value; they are not normalized into the campaign schema.

These archived records:
- are immutable historical evidence;
- cannot become current report/project state;
- cannot redefine benchmark expectations;
- may be promoted into catalogs/corpus only through an explicit evidence-backed process.
