---
name: m-bedrock-map-bug-audit
description: >
  Audit one Minecraft Bedrock/Education map version for gameplay bugs using game-design-first analysis and production report output.
---

# M-Bedrock Map Bug Audit

**Lane:** OPERATIONAL / MAP USE

## Source of truth

Audit exactly one selected `.mcworld`.

That selected map version is the only current gameplay source of truth.

Do not use older versions, Development/Source, old QA/Bug Reports, Technical Docs, changelogs, other maps, or external design documents to infer current mechanics unless comparison/history is explicitly requested.

The canonical production input may provide only runtime/platform identity (edition/version/Education features/experiments and proof execution mode). Do not inject map-specific behavior contracts, arena-region contracts, state-authority contracts, spatial policies, economy/combat/inventory contracts, or release-version intent through `SelectedMapAuditInput.target`; those belong to internal development/comparison tooling and would violate selected-artifact authority.

## Required audit order

Bug discovery cannot start before the selected world is reconstructed.

The canonical base procedure is `../../../docs/03-analysis/mandatory-audit-procedure.md`. Its five blocks are mandatory:

```text
UNDERSTAND → MODEL → STRESS → PROVE → REPORT
```

This skill routes the work; it must not duplicate or weaken those checkpoint closure rules.

The production audit has one canonical entry: `runSelectedMapAudit({ artifactPath })` in `map-audit-pipeline.ts`, and `artifactPath` must be the exact selected `.mcworld`. Low-level inspection/analyzer/reporting functions—including `inspectDirectory()` and `inspectArtifact()`—are engine plumbing and must not be used as alternate production entry points. Raw closed-audit reporting functions are additionally fail-closed behind SelectedMapAuditAuthority issued by the canonical pipeline; manually reconstructed closure inputs are insufficient. Artifact-level native proof must finish before the Mandatory Audit Procedure is re-derived and allowed to close. Ordered readiness is owned only by `map-audit-admission.ts` across TARGET → DISCOVERY → UNDERSTAND → MODEL → STRESS → PROVE → REPORT. The first blocking stage prevents production continuation. If PROVE stops on Defect Resolution, continue through `resolveSelectedMapAudit()` with the same audit run. The audit run is also the sole owner of `currentStage`, `allowedNextAction`, bounded `modelTaskPackets`, deterministic `readyDefects`, conservative `candidateGroups`, and selected-artifact identity; do not ask the model to infer the next stage, search unrelated systems, invent AI defects outside `readyDefects`, split a deterministic candidate group into duplicate AI bugs without new causal evidence, or map one deterministic root-cause group to multiple AI candidates, or supply a different map/version identity at review/report time. A model may promote a contradiction to `CONFIRMED_DEFECT_READY` only with a bounded `CounterProofSearchReceipt` proving the configured search scope was exhausted without blocking proof. Every model task/result must retain the `auditRevision`; `resolveSelectedMapAudit()`, `prepareSelectedMapAuditReview()`, and `buildSelectedMapAuditReport()` reject stale revisions. Production semantic-proof reuse and rejected-candidate reuse must also use their audit-bound wrappers; generic cache/reuse primitives are internal tooling and may not authorize reuse across audit revisions. `runSelectedMapAudit()` must reconcile preflight demand against final RIG requirements with at most two full artifact passes: discovery pass, then one union-demand reconciliation pass. If RIG demand still changes, stop as a convergence gap; do not loop/re-extract repeatedly. Work Session must remain subordinate: its stage is a coarse projection of `SelectedMapAuditRun`, never an independent authority; workflow/map-audit-work-session.ts is the only projection/persistence owner. Eager evidence collection never implies stage completion: `executionTrace` is the authority for which ordered decisions are actually authorized. Later-stage projections stay inert before authorization; `readyDefects` and `candidateGroups` must be empty until PROVE is reached. If a generic Work Session is persisted, it must carry WorkSessionAuditBinding projected from the current SelectedMapAuditRun through map-audit-work-session; its legacy stage names are only a mirror and never audit authority. Review continues through `prepareSelectedMapAuditReview()`; final production report continues through `buildSelectedMapAuditReport()`. The original audit run is carried forward so source inventory, closures, RIG, procedure receipt, and defect-resolution gates cannot be reconstructed or omitted downstream.

The engine-owned machine-readable receipt is `inspection/mandatory-audit-procedure.ts`. Production report publication must receive this receipt. OPEN checkpoints block publication. PARTIAL checkpoints block publication unless their reason is specifically `RUNTIME_PROOF_REQUIRED`; absence of a detected feature is not sufficient for `NOT_APPLICABLE` unless Discovery Closure is complete and positive non-applicability evidence is present. Do not create a parallel manual status table.

```text
Selected Map Version
→ Gameplay Surface Inventory
→ Game Design Reconstruction
→ Gameplay Flow Mapping
→ State Transition Mapping
→ Reset / Preserve Rules
→ Progression Rules
→ Multiplayer / Multi Arena Rules
→ Gameplay Model Closure
→ Actual Behavior
→ Gameplay Contradiction
→ Bug Classification
→ Production Bug Report V2
```

Required references:

- `../../../docs/03-analysis/mandatory-audit-procedure.md`
- `references/game-design-contract.md`
- `references/gameplay-flow-contract.md`
- `references/multi-arena-contract.md`
- `references/bug-report-contract.md`
- `../../../docs/03-analysis/gameplay-model-closure.md`
- `../../../docs/03-analysis/gameplay-audit-blind-spots.md`
- `../../../docs/03-analysis/cross-system-interaction-audit.md`
- `../../../docs/03-analysis/hidden-gameplay-defect-analysis.md`
- `../../../docs/03-analysis/audit-finalization-checklist.md`
- `../../schemas/map-audit-output-v2.schema.json`

## Gameplay Contract

Before bug discovery, the audit must establish and account for the full gameplay model:

- objective;
- win condition;
- lose condition;
- player journey;
- state transitions;
- reset rules;
- preserve rules;
- progression rules;
- multiplayer rules;
- multi arena rules when applicable;
- capacity/concurrency rules when applicable;
- recovery and softlock paths;
- boundary scenarios;
- player-facing feedback for material limitations;
- persistence boundaries.

If expected behavior cannot be grounded from the selected artifact, keep it unknown. Do not convert unknown into Designed Behavior.

Bug discovery starts only after Gameplay Model Closure is CLOSED or PARTIAL. OPEN closure forbids comprehensive bug claims and finalization.

## Gameplay scenario audit backbone

The audit is scenario-driven. Surface discovery and technical analyzers provide evidence; they do not close gameplay by themselves.

Knowledge activation is also scenario-driven. Do not preload every analyzer and do not rely on names/keywords to decide applicability.

Preflight is not allowed to prove non-applicability by silence. It must combine raw structured source evidence, selected-artifact semantic intent, configured behavior contracts, and platform/profile facts. When those sources disagree or Discovery Closure is incomplete, keep the checkpoint OPEN/PARTIAL instead of pruning the domain as absent.

Capabilities must declare one execution phase. `discovery-core` is reserved for the cheapest information required to discover/reconstruct gameplay; `rig-directed` capabilities should execute only when required by active RIG nodes or explicit higher-context proof. Do not move deep diagnostic work into discovery-core for convenience.

For every material Gameplay Scenario:
