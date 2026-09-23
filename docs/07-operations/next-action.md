# Next Action

Reliability Search now has append-only campaign history contracts and domain-specific minimizers.

Implemented:

1. append-only campaign evidence model;
2. content-derived campaign record identity;
3. duplicate evidence rejection;
4. repository history lane under reliability/history;
5. source-line minimizer;
6. timed-scenario minimizer with timing normalization;
7. dependency-graph fixture minimizer;
8. orchestration helper for building campaign history records.

Next high-value work:

1. persistent filesystem loader/writer for campaign history with immutability checks;
2. aggregate historical records directly into blindspot/effectiveness reports;
3. automatic targeted-search tasks from aggregated P0/P1 blindspots;
4. then dynamic invariant mining from known-good traces, validated against historical mutation survivors before promotion.

History is evidence, not semantic truth; never rewrite old campaign records to improve metrics.
