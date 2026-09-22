# Script API Static Analysis

Script content is analyzed statically and is never executed.

## Current facts

The analyzer extracts:

- ES module imports;
- @minecraft/* module usage;
- relative script dependencies;
- world and system references;
- beforeEvents / afterEvents subscriptions;
- system.afterEvents.scriptEventReceive subscriptions;
- dynamic property API calls;
- literal dynamic-property IDs when statically visible.

Microsoft documents World event collections and System event collections as first-class Script API surfaces, and system.afterEvents.scriptEventReceive is the event raised by /scriptevent. citeturn771857search0turn771857search1turn771857search4

Microsoft also separates Script API module versions into stable, beta, and internal tracks; beta APIs do not carry stable backwards-compatibility guarantees and require Beta APIs experiment enablement. citeturn771857search2

## Analysis boundary

The analyzer does not execute code or attempt full program evaluation.

```text
source text
→ TypeScript parser AST
→ syntactic semantic facts
→ module graph / capability facts
→ diagnostics
```

Computed property names, runtime-generated imports, reflective behavior, and arbitrary data flow remain unknown unless a dedicated static analysis later proves them.

## Dynamic properties

Dynamic-property use is tracked by operation and literal property ID when available. Computed IDs remain present as an access with unknown ID.

This supports future correlation with world DB dynamic-property records without making DB semantics part of the script parser.
