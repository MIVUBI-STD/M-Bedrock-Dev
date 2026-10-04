# Next Action

## Current lane — Real Map Audit / Detection Benchmark

Architecture is frozen again.

The only production flow is:

```text
raw user request
→ Pre-Audit Plan
→ user confirms scope / method
→ audit <selected.mcworld>
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

The current 22-map source/package deep pass is closed. For this batch, do **not** reopen broad source discovery unless the artifact/version changes or new evidence exposes a concrete detection gap.

Current continuation:

```text
approved canonical findings
→ targeted runtime residue only
→ exact scenario execution on LOCAL_MINECRAFT / LIVE_MINECRAFT
→ PASS | FAIL→promote | INCONCLUSIVE
```

Runtime scenarios for the current batch are projected in:
`experiments/real-map-audits/runtime-validation.md`.

For a new or changed selected artifact, before source/gameplay analysis, show one compact Pre-Audit Plan in chat and confirm:
- target/map version;
- comprehensive pre-testing objective;
- systems/check families that will be inspected;
- static-first / bounded causal proof strategy;
- requested focus or constraints;
- expected Map Audit output.

Do not ask the user to supply known symptoms unless they already have some. This workflow exists to discover issues before manual testing.

Then use one exact selected artifact with stable SHA-256.

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

## Review versus proof improvement

`PREPARE_REVIEW` means the Map Audit Report is complete enough to review honestly. It does not mean all findings are PROVEN.

When review-ready output still contains NEED_VALIDATION:

```text
Map Audit Report
→ may be reviewed now
→ optional bounded proof-improvement tasks may still promote findings
→ unresolved findings remain visible if proof cannot be obtained
```

A blocking PROVE checkpoint is different: it requires `RESOLVE_DEFECTS` before review readiness.

## Hard rules

- one artifact = one current gameplay authority;
- only `audit` is a production map-audit command;
- no specialist document owns an alternate workflow;
- source-accounted does not mean semantically understood;
- unknown semantic ownership = Detection Gap, never PASS;
- technical/platform explanation does not erase player-visible Design Mismatch;
- Bug Report V2 preserves explicit `issueType` (`BUG` or `DESIGN_MISMATCH`); legacy entries without it are interpreted as `BUG`;
- one root cause belongs to one issue lane;
- Scenario PARTIAL is allowed only for irreducible runtime proof;
- no new manager/router/state machine/report authority unless real-map evidence proves the existing owner cannot express the required behavior.

## Deferred

- CI/local test execution unless explicitly requested;
- LOCAL_MINECRAFT/LIVE_MINECRAFT except for a specific runtime-proof residue;
- benchmark promotion until exact artifact identity and frozen expectations exist.
