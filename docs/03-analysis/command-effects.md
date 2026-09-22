# Typed Command Effects

Command analysis separates tokenization, selector facts, command semantics, and downstream effects.

Current high-value grammar covers:

- function calls;
- structure load;
- fill;
- setblock;
- clone;
- teleport/tp;
- scoreboard players operations;
- tag mutation;
- selectors with scores/tag filters;
- recursive modern execute ... run nesting.

## Selector reads

Selectors are semantic reads.

Example:

```mcfunction
@a[tag=arena1,scores={stage=1..}]
```

produces read facts for:

- tag `arena1`;
- scoreboard objective `stage`.

This matters for multi-arena state-scope analysis because reads hidden in selector filters are part of gameplay state dependencies.

## Scoreboard operation

`scoreboard players operation` is modeled as:

- target objective: read + write;
- source objective: read.

Other mutating operations write their target objective. `test` is read-only.

## Execute

Modern `execute ... run <command>` preserves the outer execute wrapper and recursively analyzes the nested command. Selector facts from both wrapper and nested command remain visible after flattening.

This is still intentionally not a complete grammar for every Bedrock command. Unsupported syntax is preserved as unknown rather than guessed.
