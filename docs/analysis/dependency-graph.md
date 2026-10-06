---
id: document.analysis.dependency-graph
class: DOCUMENT
domain: analysis
role: REFERENCE
authority: CANONICAL
lifecycle: ACTIVE
---

# Semantic Dependency Graph

The graph answers how normalized content relates semantically. It is separate from the artifact containment graph.

## Edge status

References are never silently dropped.

```text
resolved    → one known target
unresolved  → target identifier exists in source text but no target node resolves
ambiguous   → multiple target candidates exist
```

Unresolved and ambiguous references are first-class diagnostic evidence.

## Typed relationships

Initial edge vocabulary includes:

```text
CALLS
LOADS_STRUCTURE
REFERENCES_ENTITY
USES_ANIMATION
USES_CONTROLLER
DEPENDS_ON_PACK
EXECUTES_EVENT
READS_SCOREBOARD
WRITES_SCOREBOARD
ADDS_TAG
REMOVES_TAG
TELEPORTS_TO
MODIFIES_REGION
REFERENCES
```

The vocabulary expands only when analyzers need a semantically meaningful distinction.

## Query surface

The initial graph supports:

- node lookup;
- kind lookup;
- incoming/outgoing references;
- dependencies;
- dependents;
- unresolved references;
- ambiguous references;
- reverse impact tracing.

## Incremental invalidation

A changed semantic node invalidates itself and reverse dependents, not the entire project.

More precise analyzer-level invalidation can be added later, but unrelated graph branches should remain reusable.

## Dialogue scene graph

NPC dialogue scenes are executable semantic content when they contain open/close/button commands.

Dialogue-scene commands enter the same dependency graph and may:
- call functions;
- load structures;
- read/write scoreboards;
- add/remove tags;
- reference another dialogue scene.

Scene references remain resolved/unresolved/ambiguous like other graph edges.

The initiating player identity is distinct from the executing NPC context. Multiplayer/session validity is handled by interaction/player-lifecycle analysis rather than by the graph itself.