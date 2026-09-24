# Validation

Canonical proof/evidence policy for product behavior.

Proof levels:

```text
STATIC VERIFIED
PACKAGE VERIFIED
LOCAL GAME VERIFIED
LIVE GAME VERIFIED
UNKNOWN
```

Use the lowest-cost evidence that can falsify the claim, but never promote one proof level into another.

For ambiguous runtime failures, use [Active Runtime Diagnosis](./active-runtime-diagnosis.md) so repair follows falsifying evidence rather than symptom matching.
