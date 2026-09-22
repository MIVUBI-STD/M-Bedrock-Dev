# Runtime Divergence Search Feedback

Live/runtime incidents can now feed the same semantic corpus model used by offline search.

## Coverage features

Runtime comparison produces features for:

- divergence class + subject;
- violated invariant id;
- explicit unknown evidence;
- selected entity-count interaction signatures.

Examples:

```text
divergence:arena-state:arena=arena2
divergence:unknown:arena:arena2:cutscene-unknown
invariant:multiplayer.state-isolation
interaction:entity-count:minecraft:zombie:4
```

## Dedicated runtime corpus

`RuntimeDivergenceCorpus` retains observations that either:

- introduce a new runtime semantic feature; or
- are failures.

Repeated failures with the same divergence class can still be retained when their input identity differs, while the global coverage set remains deduplicated.

## Why this matters

Coverage-guided exploration should learn from real Minecraft behavior.

An unexpected runtime divergence becomes a new search signal that can later seed:

- targeted scenario mutation;
- timing perturbation;
- regression minimization;
- mutation-test operator selection.

The runtime corpus remains evidence. It does not change model correctness rules.
