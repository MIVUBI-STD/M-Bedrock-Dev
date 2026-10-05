# Runtime Proof

## Purpose

Canonical runtime-validation guidance for Minecraft Bedrock/Education.

Runtime proof exists only to resolve claims that static, package, semantic, formal, or quantitative evidence cannot decide safely.

## Evidence ladder

```text
source exists
→ schema/version capability valid
→ execution context valid
→ event/callback reached
→ target resolved
→ required chunk/region ready
→ entity/state handle valid
→ mutation completed
→ downstream consumer observed
→ gameplay invariant holds
```

Never collapse adjacent levels.

## Runtime proof workflow

```text
exact unresolved claim
→ choose cheapest discriminating observation/probe
→ bind artifact + runtime profile + scenario scope
→ execute bounded control if needed
→ capture RuntimeObservation
→ compare against expected invariant/model
→ preserve unknowns explicitly
→ conclude claim or keep one narrow runtime question
```

Runtime is not a generic reassurance step and must not become a broad manual-testing matrix.

## Runtime control

Control and observation are separate authorities.

Generic control vocabulary stays small and bounded:
- assign player/session;
- start session;
- reset arena/session;
- request disconnect/reconnect scenarios where supported.

Project-specific adapters translate generic control intent into the map's actual mechanisms. Do not expose arbitrary remote command execution.

A simulated marker is not equivalent to a real network disconnect.

## Runtime observation

All harnesses emit a shared evidence shape containing target/runtime identity, tick, player/session state, arena state, entities/chunks when relevant, and explicit unknowns.

Missing fields remain UNKNOWN. They are never silently replaced with proof.

Runtime comparison follows:

```text
Expected Model / Invariant
+ Runtime Observation
→ Normalization
→ Divergence / Invariant Check
→ Runtime Evidence
```

## Probes

Use typed narrow probes for exact unresolved predicates such as:
- chunk loaded/readiness;
- entity resolvability/liveness;
- tag/role state;
- scoreboard/state value;
- other explicitly registered bounded predicates.

Probe failures produce UNKNOWN evidence rather than false absence.

Probe identity, scope, runtime tick, artifact identity, and outcome mapping must remain bound end-to-end.

## Telemetry

Telemetry captures spontaneous runtime events and anomalies. It is useful for:
- stale callbacks;
- fallback behavior;
- lifecycle stalls;
- unexpected ownership changes;
- divergence signatures.

Telemetry raises or supports claims; it does not invent correctness semantics.

## Controlled experiments

Use a runtime laboratory when causal separation requires controlled factors, control/treatment arms, repeated trials, and environment fingerprints.

Qualification may progress through:

```text
insufficient
→ observed
→ repeatable
→ intervention-supported
```

Even intervention-supported evidence does not automatically prove every alternative cause is excluded.

## Live harness

The development harness captures bounded project-configured runtime state and emits observation records. It does not decide correctness and must not infer project naming conventions.

## Regression runner

A live regression runner aligns runtime snapshots to an explicit scenario tick anchor, compares expected vs observed state, and records the first meaningful divergence plus nearby evidence.

It evaluates captured evidence; it does not itself drive Minecraft UI or fabricate players.

## Context ceiling

```text
REMOTE_GITHUB   → source hypotheses / probe design
LOCAL_ARTIFACT  → archive/world/database evidence
LOCAL_MINECRAFT → import/load/local runtime
LIVE_MINECRAFT  → gameplay/timing/simulation/multiplayer
```

Never report proof above the available context.

## STOP

Runtime proof is complete when the exact unresolved claim is decided or reduced to one explicit irreducible question with bounded reproduction/observation instructions.
