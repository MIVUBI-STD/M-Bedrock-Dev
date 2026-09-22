# Typed Command Effects

Command analysis separates raw syntax from semantic effects.

```text
raw command
→ command analysis
→ typed effects
→ graph / diagnostics / topology analyzers
```

Initial typed effects:

- fill region mutation;
- setblock mutation;
- clone region mutation;
- teleport;
- scoreboard write;
- tag mutation;
- recursive `execute ... run` nesting;
- unknown preserved command.

Coordinates preserve Bedrock coordinate mode:

```text
absolute  10
relative  ~10
local     ^10
```

This distinction is mandatory. Relative/local coordinates cannot be treated as world-space positions until execution context is known.

## Recursive execute

`execute ... run <command>` is treated as a wrapper plus nested command analysis. Downstream analyzers may flatten nested effects while still retaining wrapper evidence.

This is intentionally not yet a full command AST. The model captures high-value semantic effects first and expands only when real analysis requires more syntax.
