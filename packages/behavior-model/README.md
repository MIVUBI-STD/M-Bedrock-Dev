# Behavioral World Model

The Behavioral World Model is the formal state/transition/temporal kernel for M-Bedrock-Dev.

It is deliberately separate from:

- Semantic IR, which describes normalized source execution/state/temporal structure;
- the knowledge catalog, which stores evidence-backed claims;
- Runtime Lab, which executes controlled experiments;
- reliability search, which explores candidate state/input schedules.

## Kernel

The kernel owns:

- typed semantic variable declarations;
- scoped state instances so multiple players/entities/arenas do not alias;
- explicit authority labels;
- composable boolean predicates;
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

## Minecraft overlays

Initial model fragments cover:

- player/session lifecycle;
- entity lifecycle/navigation ownership;
- chunk loaded-for-script residency;
- deferred callback generation safety.

These fragments are specification templates, not claims that Minecraft implements the transition exactly as written.

A concrete analysis must bind each semantic variable/transition to source, documented knowledge, project policy, or runtime evidence before using it as engine truth.

## Composition

Multiple scoped fragments can share one semantic variable declaration while operating on distinct state instances.

This avoids the common modeling error where two players or two arenas collapse into a single abstract state cell.

## Non-goals

The current package is not a complete Minecraft simulator, model checker, causal engine, or runtime oracle.

It does not assume Bedrock and Education have identical semantics.
