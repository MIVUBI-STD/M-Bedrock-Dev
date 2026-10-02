# Map Audit Routing Guide

## Purpose

Defines the mandatory reading and execution order before starting a Minecraft map bug audit.

## Production entrypoint

All production selected-map bug analysis starts from exactly one operator command and one engine API:

```text
audit <selected-map>
        ↓
runSelectedMapAudit({ artifactPath })
```

The canonical stage order is:

```text
TARGET → DISCOVERY → UNDERSTAND → MODEL → STRESS → PROVE → REPORT
```

`inspect`, `review`, `workflow`, `arena-audit`, and runtime-probe utilities are engineering-only projections/tools. They are not production entry points and require the explicit engineering-tools gate. Low-level `inspectArtifact()` remains internal plumbing for corpus work, comparison, repair verification, and bounded engine development only.

Caller-supplied map-specific contracts or arena layouts are forbidden on the production path; the selected artifact remains the sole gameplay authority.

## Required order

```text
Selected World Version
→ Multi-source Gameplay Surface Discovery
→ Game Design Reconstruction
→ Gameplay Flow + Per-State Closure
→ Reset / Preserve / Progression Rules
→ Boundary Registry
→ Multiplayer / Multi Arena / Capacity / Replica Integrity
→ Reachability + Capability Exposure
→ Hidden-Defect / Negative-Space / Temporal Analysis
→ Cross-System Interaction Review
→ Gameplay Model Closure
→ Actual Behavior
→ Gameplay Contradiction
→ Engineering Analysis when complex
→ Bug Classification
→ Coverage Accounting
→ Closure-gated Review
→ Bug Report V2
```

## Required references

Before finalizing bugs, read and apply:

- Game Design Audit Checklist
- Gameplay Flow Contract
- Multi Arena Audit Contract
- Capacity and Concurrency Contract
- Gameplay Audit Blind-Spot Contract
- Cross-System Interaction Audit Matrix
- Audit Finalization Checklist
- Bug Report V2 Contract
- Map Audit Output V2 Schema

Runtime-domain contracts are loaded when their system is present in the selected artifact.

## Rules

- The selected world version is the gameplay authority.
- Do not import mechanics from stale documentation.
- Do not report implementation details as bugs without player impact.
- Every reported issue must connect to a gameplay flow.
- Every applicable coverage surface must be checked, blocked, or marked not-applicable with a reason.
- Unsupported or unparsed gameplay surfaces become Detection Gap.
- A clean happy path does not complete the audit.


## Production gates

- Gameplay Discovery Closure `OPEN` or `PARTIAL` blocks production continuation. Discovery `PARTIAL` represents unresolved selected-artifact references, not a runtime exception.
- Gameplay Model Closure `OPEN` or `PARTIAL` blocks comprehensive review and report publication.
- Gameplay Scenario Closure `PARTIAL` is allowed only because the closure implementation reserves that state for irreducible Minecraft runtime proof; detection gaps and missing knowledge remain `OPEN`.
- Sensitive capability exposure can block release even when prerequisite reachability is not yet fully proven; reachability distinguishes confirmed exposure from potential exposure.
- Replica integrity uses progressive evidence: native chunk fingerprints first, then decoded voxel/block-entity proof when required.
- Known issue examples are regression fixtures only. Routing must remain object- and map-agnostic.


## Efficient first-pass execution

Use this ordering to minimize wasted analysis:

```text
Cheap source/surface discovery
→ Gameplay Discovery Closure
→ Game Design / State / Boundary reconstruction
→ Gameplay Model Closure
→ Risk-directed proof priority
→ Contradiction discovery
→ Early intent/counter-evidence confirmation
→ Exact-work deduplication
→ Deep classification only for surviving candidates
→ Engineering analysis only for complex confirmed findings
→ Closure-gated report
```

Rules:

- Discovery Closure retains relevant/indexed/parse-failure counts and must balance the raw relevant-source inventory before it can become `COMPLETE`.
- Discovery Closure `OPEN` or `PARTIAL` blocks production continuation.
- Low-risk surfaces still receive coverage accounting, but default to static proof depth.
- Medium/high-risk surfaces receive targeted/deep proof escalation.
- A candidate that fails confirmation must stop before expensive classification/trigger work.
- Exact duplicate candidate work may be skipped, but corroborating evidence from another route or different evidence set must be retained.
