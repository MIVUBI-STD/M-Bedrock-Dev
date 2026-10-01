# Reliability Catalogs and Corpus

Durable reliability evidence is rooted under `engine/reliability/`.

Canonical routing:

```text
engine/reliability/README.md
```

## Catalogs

Durable blindspot and reliability knowledge lives under:

```text
engine/reliability/catalogs/
```

### Regression catalog

`catalogs/regressions.json` stores historical bug knowledge as minimized metadata rather than private world files.

Initial seeded regressions cover cases such as:

- Capture Run gate blocked by an unintended fill;
- Loadout Trial entity failing to break a wall;
- concurrent multi-arena cutscenes serializing across sessions.

These entries support future retest selection. They are not claims that every map shares the same defect.

### Coverage and capability proof

Coverage remains conservative. Unknown and partial states are useful.

Capability-specific proof binding lives in:

```text
engine/reliability/catalogs/capability-proof-bindings.json
```

Generated capability/proof state lives under:

```text
engine/reliability/catalogs/capability-truth/
```

### Minecraft update catalogs

Update deltas are version-specific and must include source/confidence.

Do not add speculative update JSON merely to make a matrix look complete.

## Benchmark corpus

Frozen evaluation manifests live under:

```text
engine/reliability/corpus/
├── calibration.json
├── acceptance.json
└── regressions.json
```

The corpus is evaluation input, not historical knowledge.

- calibration may inform detector development;
- acceptance is blind/holdout evidence;
- regression is the frozen benchmark manifest for reproduced failures.

Minimized executable fixture content remains under:

```text
engine/fixtures/regressions/
```

## History

Chronological execution/campaign evidence belongs in:

```text
engine/reliability/history/
```

History records what happened. It does not redefine expectations or gameplay semantics.

## Naming boundary

```text
catalogs/regressions.json
  = historical bug knowledge

corpus/regressions.json
  = frozen regression benchmark manifest

fixtures/regressions/
  = minimized reproducible input
```

Keep these roles separate and do not create another regression owner.

## Validation

Repository/runtime loaders should fail closed on:

- invalid schema version;
- duplicate durable IDs;
- missing artifact identity where scoring requires it;
- stale or unfrozen expectations;
- invalid regression behavior fields;
- coverage key duplication;
- update filename/version disagreement.

Catalog-backed retest APIs may combine durable records with live map inspection, but static/package evidence must never be promoted into Minecraft runtime proof.
