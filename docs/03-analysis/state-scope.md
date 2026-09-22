# State Scope Analysis

Gameplay state dependencies are derived from typed command effects.

Current state families:

- scoreboard objectives;
- tags.

Reads include selector filters such as:

```mcfunction
@a[tag=arena1,scores={stage=1..}]
```

Writes include scoreboard mutations and tag add/remove operations.

## Broad-write risk

A write is considered broadly scoped when its selector is exactly:

```text
@a
@e
```

Filtered selectors are not automatically treated as safe or unsafe; their isolation semantics need more evidence.

Broad writes emit CROSS_SCOPE_STATE_RISK because they can couple otherwise independent gameplay sessions.

This is a risk diagnostic, not proof of a multiplayer bug.
