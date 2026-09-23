# Script API Static Compatibility Coverage

The remote static `@minecraft/server` compatibility architecture is evidence-driven and bounded.

## Covered lanes

1. module/version and stable/beta/internal track classification;
2. event and method symbol availability;
3. bounded receiver inference;
4. property, enum member, imported type, named-import, and namespace-import extraction;
5. deprecated and removed methods/events/properties/enums/types;
6. method signature and argument-shape migrations;
7. optional return-contract migrations;
8. bounded local guard flow for optional results;
9. property mutability transitions and incompatible writes;
10. enum backing-value migrations when explicit literal comparisons are observable;
11. receiver-aware restricted execution and restricted custom-command callbacks;
12. real-map usage, call-shape, result-use, property-write, and portfolio distributions;
13. Minecraft update correlation against observed Script API symbols.

## Evidence rule

A static rule is added only when the source pattern is deterministic and official or controlled evidence supports the transition. Unknown patterns remain unknown.

## Deep object shapes

No broad deep-options object checker is enabled. The current curated `@minecraft/server` evidence does not justify speculative field-level inference. Add such rules only when a real production map exposes the pattern and official documentation names the field migration precisely.

## Deliberate non-static lanes

These are not remote-static implementation gaps:

- runtime-generated/reflection-style access;
- arbitrary interprocedural type flow;
- semantic behavior changes with identical syntax;
- engine scheduling, chunk timing, entity AI, multiplayer interleavings, and native-world behavior.

Those require production-artifact, runtime, differential, or live-game evidence.

## Completion criterion

The remote static architecture is source-complete for the current curated evidence set. Further growth is usage-driven evidence ingestion, not speculative architecture expansion.
