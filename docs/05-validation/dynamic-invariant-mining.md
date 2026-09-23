# Dynamic Invariant Mining

Invariant mining discovers likely relationships from known-good runtime traces. It does not redefine correctness automatically.

## Initial candidate families

The first conservative miner evaluates:

- active player phase → connected;
- active player phase → arena assignment;
- arena cutscene active → at least one starting player assigned to that arena;
- disconnected player → zero active progress.

These are deliberately simple relational candidates with explicit runtime fields.

## Support and confidence

Each candidate records:

```text
observations
antecedentMatches
satisfied
counterexamples
confidence
```

`confidence = satisfied / antecedentMatches`.

A candidate becomes `supported` only when:

- no known-good counterexample exists;
- minimum antecedent support is reached;
- configured confidence threshold is reached.

Default mining requires 20 antecedent matches and confidence 1.0.

A single known-good counterexample rejects the candidate.

## Challenge phase

Supported candidates are challenged against:

- historical failure snapshots;
- mutation campaign history.

A historical failure that contradicts the relationship marks the candidate `challenged`.

A survived mutation relevant to the candidate also marks it `challenged`, because the current detector stack may not be strong enough to trust promotion.

## Promotion boundary

`draftInvariantPromotion()` can produce a review draft only for candidates that remain `supported` and unchallenged.

It never writes to `InvariantRegistry`.

```text
known-good traces
→ mine
→ support/confidence
→ challenge history
→ promotion draft
→ HUMAN REVIEW
→ optional durable invariant
```

This prevents frequent behavior from silently becoming a correctness rule.

## Why historical failures matter

A relation may hold in every successful test simply because the test corpus never reached the problematic state.

Historical failures and survived mutants act as adversarial evidence against overconfident invariant mining.
