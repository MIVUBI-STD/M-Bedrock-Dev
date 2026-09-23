# Invariant Coverage, Cross-map Evidence and Revalidation

Invariant intelligence now separates four evidence dimensions:

- raw observation count;
- semantic state diversity;
- semantic coverage-bucket diversity;
- map diversity.

A large repeated trace from one map is not equivalent to evidence across different behaviors and maps.

## Coverage correlation

`mineInvariantEvidence()` accepts semantic coverage beside snapshots. A candidate can remain `candidate` despite confidence 1.0 when coverage diversity is below policy.

## Cross-map evidence

Project-generic candidates can be summarized by supporting, challenged/stale, rejected, and candidate-only maps. Contradiction on another known-good map stays visible rather than being averaged away.

## Update-driven revalidation

Each candidate kind maps conservatively to reliability domains and capability tags. A Minecraft Update Delta that overlaps those surfaces creates a revalidation task.

Behavior changes, validation tightening, and removals receive P0 revalidation priority.

## Final trust model

Promotion remains human-gated and should require no known-good counterexample, sufficient support, diverse states, diverse coverage buckets, appropriate cross-map evidence, current-version evidence, and no relevant mutation-survivor challenge.
