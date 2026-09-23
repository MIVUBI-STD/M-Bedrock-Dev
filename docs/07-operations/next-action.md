# Next Action

Reliability Search now closes the loop from historical evidence to future targeted search.

Implemented:

1. persistent append-only campaign history writer;
2. immutable content-derived filenames/identities;
3. deterministic history loader;
4. repository history integrity verification;
5. historical operator-effectiveness aggregation;
6. historical blindspot aggregation;
7. adaptive budget from historical evidence;
8. automatic P0/P1 targeted-search tasks with explicit objectives.

Next high-value work:

1. dynamic invariant mining from known-good session/runtime traces;
2. keep mined invariants as candidates with support/confidence, never auto-promote;
3. cross-check candidate invariants against mutation survivors and historical failures;
4. reject candidates contradicted by known-good traces;
5. only promote reviewed/stable candidates into the durable Invariant Registry.

At this point, avoid expanding framework breadth unless invariant mining reveals a concrete detector gap.
