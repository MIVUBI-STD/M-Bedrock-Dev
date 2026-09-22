# Script and Dependency-Graph Mutation

Mutation testing now covers Script API behavior and multi-function dependency graphs.

## Script event mutations

Current operators:

- drop event subscription;
- rename event to a non-canonical event;
- duplicate event subscription;
- substitute dynamic-property id.

Detection uses the existing TypeScript AST analyzer.

The baseline and mutant are compared by:

- event subscription signatures/counts;
- new event identities;
- known dynamic-property ids;
- relative import resolution when companion scripts are supplied.

This is structural detection. Whether a duplicated subscription is semantically harmful at runtime still depends on the map and may require runtime/differential evidence.

## Multi-function graph mutation

Function redirect mutations can now be evaluated across multiple function files.

```text
root.mcfunction
→ function game/child

mutant
→ function __mutation_missing__/game/child
```

Both baseline and mutant are passed through the real semantic graph builder. A newly unresolved edge kills the mutation.

## Automatic blindspot tasks

Every survived mutant can become a `BlindspotTask`.

The task carries:

- operator;
- domain;
- reason;
- priority;
- suggested detector/search strategies;
- original evidence when available.

Examples:

```text
survived coordinate-shift
→ topology + differential + runtime-observation

survived script-event-drop
→ static-analysis + dependency-graph + runtime-observation

survived concurrency mutation
→ generative + runtime-observation + invariant
```

This turns mutation testing into an engineering backlog generator rather than a score-only report.
