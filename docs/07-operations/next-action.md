# Next Action

Blindspot Defense Phase A is now represented as first-class source contracts.

Implemented foundation:

1. Invariant Registry;
2. Regression Corpus model;
3. Map Compatibility Fingerprint;
4. Minecraft Update Delta model;
5. Blindspot Coverage states;
6. Risk-based Retest Planner.

Next high-value integration:

1. derive map fingerprints automatically from integrated inspection instead of manual fact input;
2. add a repository-owned regression catalog format and validation;
3. add update-delta ingestion adapters from curated/official evidence;
4. only then start Phase B generative/state-machine testing.

Do not build runtime fuzzing before the planner can reliably identify which invariant/domain/capability it is exercising.
