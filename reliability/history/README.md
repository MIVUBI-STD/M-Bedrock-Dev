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
