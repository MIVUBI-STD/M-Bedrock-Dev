# Current Validation

Snapshot date: 2026-10-02  
Branch: `Local`

## Historical integrated proof

The last retained integrated verification remains:

```text
revision       5e02256869b4fc2107a1cbcf0ff85f0aac6745ac
GitHub Verify  36431630205
policy         pass
source hygiene pass
public API     pass
typecheck      pass
full tests     pass
```

That historical run does **not** verify the current source state.

## Current-head static implementation state

Current `Local` now has one production map-audit entry and one ordered authority path:

```text
audit <selected-map>
→ runSelectedMapAudit()
→ TARGET
→ DISCOVERY
→ UNDERSTAND
→ MODEL
→ STRESS
→ PROVE
→ REPORT
```

Current static/source-level hardening includes:

- sole production CLI entry `audit`; audit projections are namespaced `dev-*` and explicitly gated;
- repository verification that blocks app-level imports of internal inspection/reporting plumbing;
- one canonical stage order shared by admission, execution trace, and `SelectedMapAuditRun`;
- selected-artifact-only gameplay authority;
- Discovery Closure with relevant/indexed/parse-failure/unsupported-source accounting;
- explicit gameplay-sensitive unsupported-source residue with concrete file paths;
- Gameplay Model Closure fail-closed on OPEN/PARTIAL;
- Scenario Closure fail-closed for missing knowledge, capability gaps, orphan components, shallow leaf scenarios, and detection gaps;
- automatic narrow runtime-proof requests for `RUNTIME_BLOCKED` causal links;
- compiler reconciliation of generated causal links back into scenario receipts;
- cross-system preset scenarios for terminal collisions, reconnect/reload, multi-arena, deferred ownership, and repeated-run behavior;
- bounded RIG demand reconciliation;
- counter-proof-gated confirmed defect admission;
- capability-specific proof bindings for all 51 registered production task capabilities;
- Capability Truth freshness bound to the generator contract, registries, proof registry, and proof inventory;
- repository verification now fails when a production task capability lacks a specific proof binding.

During this work session one source defect was also found and fixed while adding capability proof:

```text
behavior.spatial
resolveSpatialAuthorityContract()
validated an undefined identifier (policy)
instead of the supplied contract.
```

This was corrected before the capability was marked proof-bound.

## Current Capability Truth

Current generated truth:

```text
task capabilities  51
owner-tested       51
proof-bound        51
proof-unbound      0
analysis caps      31
```

A proof binding means a capability-specific regression/contract surface exists. It does not claim that the test was executed in this work session.

## Known proof limits

- current source state has not been typechecked or run through the full test suite in this work session;
- CI has not been run for these latest changes;
- LOCAL_MINECRAFT/LIVE_MINECRAFT behavior remains unproven where runtime semantics are irreducible;
- real-map false-negative/false-positive rates are not yet measured for the hardened single-flow audit;
- benchmark corpus cases remain `candidate` until the exact artifact/minimized fixture SHA-256 and frozen machine expectation requirements are satisfied;
- no benchmark case is promoted to `ready` merely from a map name or historical bug description.

## Next proof target

Run one exact selected map artifact through the sole production command:

```text
audit <selected-map>
```

Record:

- selected-artifact identity/fingerprint;
- Discovery Closure and unsupported-source residue;
- Gameplay Model Closure;
- Scenario Closure and shallow-scenario residue;
- RIG receipts;
- first-pass confirmed/suppressed issue set;
- runtime-proof requests;
- known-issue capture versus frozen regression expectations;
- false positives / false negatives where independent expectations exist.

Do not expand the architecture before this evidence exists.

## Rule

Do not claim current-head CI/runtime proof until it is actually run. Historical proof remains historical. Static source inspection and proof bindings must remain labeled as static verification.
