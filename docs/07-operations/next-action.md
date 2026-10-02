# Next Action

## Current lane — Real Map Audit / Detection Benchmark

Architecture expansion is frozen. The next work is evidence, not another framework.

Canonical production flow:

```text
audit <selected-map>
→ TARGET
→ DISCOVERY
→ UNDERSTAND
→ MODEL
→ STRESS
→ PROVE
→ REPORT
```

A blocker pauses this same flow. It does not create a parallel path.

## Current readiness

Source-level hardening is complete enough for real-map evaluation:

- one production entry;
- one canonical stage order;
- fail-closed discovery/model/scenario gates;
- unsupported gameplay-sensitive source residue;
- shallow-scenario miss detection;
- cross-system scenario coverage through the existing preset/compiler;
- narrow runtime proof requests;
- 51 / 51 registered task capabilities with capability-specific proof bindings.

## Next action

Use one exact real map artifact with stable SHA-256 and run the production audit once.

Measure:

- known-issue capture / false negatives;
- false positives;
- blocked detection gaps;
- unsupported-source residue;
- scenario depth;
- cross-system causal coverage;
- runtime-only residue;
- proof/evidence cost.

If the map is part of calibration/regression corpus, freeze the machine expectation **before** evaluating detector output and keep the artifact fingerprint immutable.

## Benchmark rule

Corpus cases remain:

```text
candidate
→ expectation-approved
→ artifact-verified
→ ready
→ scored
```

Do not mark a case `ready` without:

- exact artifact/minimized fixture identity;
- SHA-256;
- frozen expectation;
- target edition/version;
- independent provenance.

## Hard rules

- one selected artifact = one current gameplay authority;
- only `audit` is a production map-analysis command;
- `dev-*` commands are engineering tools, not alternate audit routes;
- Discovery Closure must be COMPLETE;
- Gameplay Model Closure must be CLOSED;
- Scenario PARTIAL is allowed only for irreducible runtime proof;
- a leaf scenario with components but no causal proof links blocks closure;
- every production task capability requires a capability-specific proof binding;
- known bugs are benchmark evidence, never map-name production rules;
- no Approved Bug/design change + preservation contract → no mutation.

## Freeze

Until real-map evidence shows a repeated generic gap, do **not** add:

- another audit framework;
- another state machine;
- another report schema;
- another router/manager/service layer;
- another candidate-family framework;
- map/object-specific detector rules;
- proof-of-proof infrastructure.

Prefer tightening an existing owner, adding a focused proof contract, or deleting stale residue.

## Deferred

- current-head CI/local test execution unless explicitly requested;
- LOCAL_MINECRAFT/LIVE_MINECRAFT execution unless a specific runtime-proof request requires it;
- benchmark promotion until exact artifact identity and frozen expectations are available.
