# Bedrock-specific Mutation Testing

Mutation testing measures the detector, not the map.

A mutation campaign deliberately injects plausible defect classes and asks whether the current analysis/test stack detects them.

## Source mutation operators

Initial operators:

### selector-broaden

```text
@a[tag=arena1,scores={stage=1..}]
→
@a
```

Targets cross-arena/global state leakage.

### coordinate-shift

Absolute coordinates in high-value spatial commands receive ±1 mutations.

Initial support:

- fill;
- setblock;
- teleport/tp absolute coordinate slots.

Targets off-by-one and arena translation bugs.

### structure-reference-redirect

```text
structure load demo:arena ...
→
structure load demo:__mutation_missing__arena ...
```

Targets reference-integrity detection.

## State-model mutations

Initial behavioral operators:

- reset preserves progress;
- disconnect preserves progress;
- start skips the starting phase;
- cutscene behaves as a shared/global lock.

These operators mutate the canonical session transition result, then existing invariants/model comparison determine whether the defect is caught.

## Result classes

```text
killed
survived
invalid
```

### killed

At least one detector/test exposes the injected defect.

### survived

The mutation remains behaviorally/source-visible but the configured detector does not flag it.

This is a bug-finder blindspot signal.

### invalid

The mutation or detector execution is not a meaningful test case.

Invalid mutants do not count toward the mutation score denominator.

## Score

```text
score = killed / (killed + survived)
```

The score is diagnostic, not a target to game.

Per-domain score is more important than one global number because a high aggregate score can hide a weak bug class.

## Boundary

A killed mutation does not prove the real engine cannot exhibit a more complex version of the same bug.

A survived mutation should trigger one of:

- new invariant;
- stronger analyzer;
- better scenario coverage;
- new runtime evidence;
- domain-specific detector.
