# Next Action

Reliability Search now has portfolio-level blindspot aggregation and adaptive operator budgeting.

Implemented:

1. operator effectiveness across campaigns/maps;
2. per-domain kill/survival history;
3. deduplicated blindspot aggregation;
4. recurrence counts and map spread;
5. adaptive increase/maintain/decrease search-budget recommendations;
6. bounded operator weights;
7. reliability-search history snapshot model;
8. orchestrated portfolio builder.

Next high-value work:

1. persist campaign history as append-only evidence records;
2. domain-specific minimization for source/script/timing failures;
3. automatic targeted-search task generation from high-priority aggregated blindspots;
4. only then start dynamic invariant mining from known-good traces and compare mined candidates against mutation-survival history.

Do not delete high-kill operators entirely; retain low-frequency sentinel mutations to detect future regressions in the detector itself.
