# Next Action

Map-specific retest planning is now directly available from artifact or directory inspection.

Implemented reliability flow:

1. inspect map;
2. derive semantic compatibility fingerprint;
3. combine with Minecraft Update Delta;
4. combine with Regression Corpus;
5. combine with Blindspot Coverage;
6. emit RetestPlan with priority/reasons/domains/lanes.

Next high-value work:

1. repository-owned JSON catalog files for regressions, coverage and update deltas;
2. loader + schema validation;
3. official/curated update-delta ingestion;
4. Phase B generative/state-machine test model.

Keep retest planning separate from runtime execution.
