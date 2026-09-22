# Next Action

High-end bug-finder search foundations are now first-class.

Implemented:

1. semantic coverage features for session state, transition, action-pair and multi-arena interaction;
2. novelty-retaining corpus;
3. deterministic coverage-guided mutation loop;
4. systematic interleaving exploration;
5. resource read/write independence model;
6. canonical equivalent-trace reduction;
7. deterministic ddmin failure minimizer with 1-minimal pass.

Next high-value work:

1. bounded exhaustive state explorer with canonical state hashing;
2. runtime-divergence coverage features so live incidents feed the same corpus;
3. domain-specific minimizers for timed scenarios and command/topology failures;
4. mutation-testing layer to measure which bug classes survive detection;
5. dynamic invariant mining only after enough known-good traces exist.

Do not interpret semantic coverage percentage as proof of correctness.
