# Reliability

Canonical owner for durable quality evidence that supports retest, benchmark, release, and Minecraft-update decisions.

## Structure

```text
engine/reliability/
├── catalogs/   durable reliability knowledge and capability/coverage state
├── corpus/     frozen benchmark manifests for calibration, blind acceptance, and regression evaluation
└── history/    append-oriented execution/campaign history
```

## Ownership boundaries

### catalogs/

Durable knowledge that survives individual benchmark runs.

Examples:

- historical regression metadata;
- capability proof bindings;
- coverage state;
- map fingerprints;
- Minecraft update intelligence.

`catalogs/regressions.json` is **historical failure knowledge**, not an executable benchmark manifest.

### corpus/

Frozen evaluation inputs and expectations.

```text
calibration.json
acceptance.json
regressions.json
```

`corpus/regressions.json` is the **benchmark regression manifest** that points to approved evidence/fixtures. It does not replace the historical regression catalog.

### history/

Append-oriented execution evidence. History records what happened during campaigns/runs; it does not define expected behavior.

## Related evidence

Reduced reproducible files belong in:

```text
engine/fixtures/regressions/
```

That directory owns the actual minimized fixture content.

The relationship is:

```text
historical bug knowledge
  → catalogs/regressions.json

approved benchmark expectation
  → corpus/regressions.json

minimal reproducible artifact
  → fixtures/regressions/

execution result over time
  → history/
```

Do not create another reliability, benchmark, regression, or corpus owner elsewhere.

## Proof rule

Reliability evidence informs confidence and prioritization. It does not redefine map Game Design, Minecraft platform semantics, or runtime truth.
