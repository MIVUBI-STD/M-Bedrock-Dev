# Reliability Search

High-end bug-discovery search layer for M-Bedrock-Dev.

This package owns search strategy, not Minecraft semantics.

Core engines:

- semantic coverage-guided corpus search;
- systematic concurrency schedule exploration with independence reduction;
- deterministic failure minimization (ddmin).

The package consumes domain adapters. Current first adapter targets multiplayer/session reliability from `packages/reliability`.

Principles:

- deterministic/replayable search before random stress;
- keep only inputs that add semantic coverage;
- explicit search budgets;
- canonical state/trace identities;
- never treat coverage as proof of safety;
- minimize every reproducible failure before promoting it to the regression corpus.
