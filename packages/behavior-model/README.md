# Behavioral World Model

The Behavioral World Model is the formal state/transition/temporal kernel for M-Bedrock-Dev.

It is deliberately separate from:

- Semantic IR, which describes normalized source execution/state/temporal structure;
- the knowledge catalog, which stores evidence-backed claims;
- Runtime Lab, which executes controlled experiments;
- reliability search, which explores candidate state/input schedules.

## v1 scope

The kernel owns:

- typed state-variable declarations;
- explicit authority labels;
- deterministic transition preconditions/effects;
- declared Minecraft nondeterminism surfaces;
- finite execution traces;
- temporal properties:
  - ALWAYS;
  - EVENTUALLY;
  - LEADS-TO;
  - UNTIL;
- conservative three-valued evaluation:
  - satisfied;
  - violated;
  - unknown.

Incomplete traces must not prove open-ended temporal claims.

## Non-goals

v1 is not a complete Minecraft simulator, model checker, causal engine, or runtime oracle.

It does not assume Bedrock and Education have identical semantics.

Domain-specific models and source/runtime adapters must be built above this kernel and must preserve provenance.
