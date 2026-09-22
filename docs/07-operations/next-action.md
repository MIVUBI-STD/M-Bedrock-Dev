# Next Action

Reliability Search now combines coverage-guided exploration with bounded model exploration and runtime feedback.

Implemented:

1. semantic coverage-guided corpus search;
2. systematic interleaving exploration;
3. ddmin failure minimization;
4. deterministic BFS bounded state explorer;
5. canonical session state hashing;
6. explicit state/depth budgets and truncation;
7. runtime divergence semantic signatures;
8. dedicated runtime-divergence corpus.

Next high-value work:

1. domain-specific minimizers for timed/session failures;
2. Bedrock mutation operators and mutation-score reporting;
3. use surviving mutations to identify detector blindspots;
4. add bounded model exploration coverage summaries;
5. defer dynamic invariant mining until known-good trace volume is sufficient.

Coverage and bounded exploration remain evidence within declared bounds, not proof of global correctness.
