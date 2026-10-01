# Finding Contract

Used by **Map Bug Audit**.

Every candidate must record:

```text
Candidate ID / subject
Disposition
Expected-behavior authority
Observed/static evidence
Platform Knowledge / Rule used
Behavior Contract used, if any
Proof ceiling
Severity (defect only)
Confidence / uncertainty
Detection Gap or runtime residue, if any
```

## Disposition rules

### defect
Requires grounded expected behavior plus contradictory evidence strong enough for the stated proof ceiling.

### designed-behavior
Observed behavior is consistent with grounded Map Game Design / authored intent.

### ambiguous-intent
Evidence exists, but intended behavior is not uniquely grounded.

### insufficient-evidence
Expected behavior may be known, but current evidence cannot prove the observed state.

### runtime-proof-required
Static/package evidence cannot resolve the claim and a defined runtime observation can.

### detection-gap
Current M-Bedrock-Dev capability cannot represent/read/derive/classify the required evidence reliably.

A detection gap is never assigned Blocker/Major/Minor severity.
