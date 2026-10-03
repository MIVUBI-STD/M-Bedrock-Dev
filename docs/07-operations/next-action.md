# Next Action

## Current lane — Real Map Audit / Detection Benchmark

Architecture is frozen again.

The only production flow is:

```text
audit <selected.mcworld>
→ TARGET
→ DISCOVERY
→ UNDERSTAND
→ MODEL
→ STRESS
→ PROVE
→ REPORT
→ BUG | DESIGN_MISMATCH
```

## Next action

Use one exact selected artifact with stable SHA-256.

Evaluate the complete flow once and record:

- Discovery source accounting;
- semantic-understanding gaps;
- Gameplay Model Closure;
- activated cross-system scenario families;
- Scenario Closure;
- counter-proof residue;
- `issueLanes.BUG`;
- `issueLanes.DESIGN_MISMATCH`;
- correctness of `gameplayFlow`, primary `failureDomain`, and `contributingDomains[]`;
- runtime-proof questions;
- false negatives / false positives against independent expectations.

## Hard rules

- one artifact = one current gameplay authority;
- only `audit` is a production map-audit command;
- no specialist document owns an alternate workflow;
- source-accounted does not mean semantically understood;
- unknown semantic ownership = Detection Gap, never PASS;
- technical/platform explanation does not erase player-visible Design Mismatch;
- DESIGN_MISMATCH never enters Bug Report V2 promotion;
- one root cause belongs to one issue lane;
- Scenario PARTIAL is allowed only for irreducible runtime proof;
- no new manager/router/state machine/report authority unless real-map evidence proves the existing owner cannot express the required behavior.

## Deferred

- CI/local test execution unless explicitly requested;
- LOCAL_MINECRAFT/LIVE_MINECRAFT except for a specific runtime-proof residue;
- benchmark promotion until exact artifact identity and frozen expectations exist.
