# Finding Contract

Used by **Map Bug Audit**.

Every candidate must record:

```text
Candidate ID / subject
Disposition
Expected-behavior authority
Intent assessment
Observed/static evidence
Player-visible consequence
Tester-verifiable in-game trigger availability
Platform Knowledge / Rule used
Behavior Contract used, if any
Proof ceiling
Severity (defect only)
Confidence / uncertainty
Detection Gap or runtime residue, if any
```

## Required decision order

Intent/design → player-visible consequence → tester-verifiable trigger → defect disposition → severity.

Do not severity-score a candidate before the first three gates are resolved.

## Disposition rules

### defect
Requires grounded expected behavior, contradictory evidence strong enough for the stated proof ceiling, a material player-visible gameplay consequence, and an in-game tester path that can visibly confirm the failure. Normal client output includes Blocker and Major defects only.

### designed-behavior
Observed behavior is consistent with grounded Map Game Design / authored intent. Severe-looking technical behavior is still not a bug when it is explicitly part of the design.

### ambiguous-intent
Evidence exists, but intended behavior is not uniquely grounded. Do not choose the interpretation that creates the more dramatic bug.

### insufficient-evidence
Expected behavior may be known, but current evidence cannot prove the observed state.

### runtime-proof-required
Static/package evidence cannot resolve the claim and a defined runtime observation can.

### detection-gap
Current M-Bedrock-Dev capability cannot represent/read/derive/classify the required evidence reliably.

A detection gap is never assigned Blocker/Major/Minor severity.


## Player-impact rule

Do not report metadata/version drift with no gameplay effect, implementation complexity, duplicated handlers with no demonstrated player effect, internal state differences invisible to the player, or cosmetic/polish issues in the default report.

A candidate becomes reportable only when its issue can be expressed as a player-visible failure plus gameplay consequence.

## Severity rule

- Blocker: the player cannot normally continue, start, or complete required gameplay; the game crashes/freezes; or normal in-game recovery is unavailable.
- Major: core gameplay, important player state, or fairness is materially wrong but gameplay can still continue or recover normally.
- Minor: limited player-visible impact; keep it out of the default report unless explicitly requested.
