# History-driven Reliability Search

Campaign history is now persisted as immutable evidence and can directly drive future search priorities.

## Persistence

`persistCampaignHistoryRecord()` writes records using:

```text
createdAt + campaignId + content-derived identity
```

The filesystem write uses exclusive creation.

If the exact same immutable record already exists, persistence is idempotent and returns `written: false`.

Existing files whose content does not match their identity are rejected.

## Loading

`loadCampaignHistoryDirectory()` validates:

- schema;
- timestamp;
- filename/content identity;
- duplicate identities.

Records are returned in deterministic chronological/campaign order.

## Historical analysis

Loaded records feed:

```text
operator effectiveness
+
blindspot aggregation
+
adaptive search budget
```

directly.

This makes operator weakness longitudinal rather than dependent on one current campaign.

## Targeted search tasks

Aggregated P0/P1 blindspots are converted to `TargetedSearchTask` entries containing:

- domain/operator;
- suggested strategies;
- budget weight;
- affected maps;
- evidence count;
- an explicit search objective.

Examples:

```text
coordinate-shift
→ increase topology/differential context

script-event-drop
→ strengthen static/event graph and runtime observation

state-concurrency
→ generate interleavings and invariant checks
```

These tasks guide future search. They do not automatically change analyzers or correctness rules.
