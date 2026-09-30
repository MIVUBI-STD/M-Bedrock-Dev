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
- temporal properties;
- conservative three-valued evaluation.

Incomplete traces must not prove open-ended temporal claims.

## Minecraft semantic overlays

Runtime classes are separate:

- Bedrock retail client;
- listen server;
- dedicated server;
- Realm;
- Preview;
- Education host;
- Editor.

Claims do not inherit across runtime classes unless inheritance names the source overlay and explicit claim IDs.

## Versioned semantic-claim registry

Runtime/version-specific claim revisions are stored independently from overlays.

The registry:

- keeps exact runtime-class and Minecraft-version scope;
- retains provenance/evidence ceiling;
- supports explicit supersession;
- detects active contradictory dispositions;
- refuses automatic resolution while conflict remains;
- prefers exact-version claims over unversioned fallback claims.

A documented claim and a contradictory runtime observation are not silently ranked. They remain an explicit conflict until a stronger reconciled revision supersedes both.

## Safety

Designed model fragments remain specifications.

Observed behavior does not automatically become a general engine fact.

Absence of a claim is unknown, not false.
