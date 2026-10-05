# Audit Finalization Checklist

> Run only after the sequence in `master-selected-map-audit-workflow.md`. This checklist is publication review, not an alternate audit path.

## Purpose

Final review before a gameplay bug report is considered ready.

This checklist is a publication review only. The executable checkpoint owner is `mandatory-audit-procedure.md`; do not use this checklist as a substitute for running UNDERSTAND → MODEL → STRESS → PROVE → REPORT.

## Mandatory procedure closure

- [ ] TARGET stage is closed.
- [ ] DISCOVERY stage is closed.
- [ ] UNDERSTAND block is closed, including A7 Gameplay Model Closure.
- [ ] MODEL block is closed for every applicable system.
- [ ] STRESS block is closed for every applicable lifecycle/cross-system scenario.
- [ ] PROVE has no blocking source-side work; non-blocking PARTIAL is allowed only for explicit irreducible runtime proof residue with targeted validation.
- [ ] REPORT / E1 Map Audit Report Contract preserves every material finding as PROVEN or NEED_VALIDATION; approved Bug Report V2 promotion remains limited to approved PROVEN reportable issues, with `issueType` preserving `BUG` versus `DESIGN_MISMATCH`.

## Gameplay closure

- [ ] Selected world version is defined.
- [ ] Gameplay Surface Inventory completed.
- [ ] Gameplay Discovery Closure is COMPLETE.
- [ ] Relevant source inventory balances: relevant files = indexed files + explicit parse failures + unsupported gameplay-sensitive residue.
- [ ] Relevant source parse/index failures are zero.
- [ ] Unsupported gameplay-sensitive source residue is zero; otherwise it is an explicit Detection Gap and blocks Discovery Closure.
- [ ] Discovery Closure OPEN or PARTIAL blocks production continuation.
- [ ] Every discovered gameplay surface is understood, blocked, unknown, or not-applicable.
- [ ] No discovered surface is unaccounted.
- [ ] Major state model includes happy, failure, retry, recovery, disconnect/reconnect, cleanup, and reuse exits.
- [ ] Material boundaries/limits extracted.
- [ ] Coexisting/high-risk cross-system relationships identified.
- [ ] Gameplay Model Closure is CLOSED.
- [ ] Gameplay Model Closure OPEN or PARTIAL blocks production continuation.
- [ ] Gameplay Scenario Closure is CLOSED or PARTIAL only for irreducible Minecraft runtime proof.

## Issue taxonomy

- [ ] Every reportable issue has one canonical `gameplayFlow`.
- [ ] Every reportable issue has one primary `failureDomain`.
- [ ] Cross-system involvement is retained in `contributingDomains[]`.
- [ ] `category` is not used as a second audit taxonomy.
- [ ] Severity is based on player/game impact, not the domain name.
- [ ] Wave/progression issues caused by chunk/entity systems retain progression as primary while preserving chunk/entity contributing domains.
- [ ] UI/information contradictions use `ui-feedback-information` and are classified BUG vs DESIGN_MISMATCH from the actual contract mismatch, not from UI presence alone.

## Report type separation

- [ ] Every confirmed issue is classified as exactly one of `BUG` or `DESIGN_MISMATCH`.
- [ ] `BUG`: design/intent is grounded; implementation/runtime violates it.
- [ ] `DESIGN_MISMATCH`: presented/authored capability differs from actual playable/deliverable capability.
- [ ] No root cause is duplicated across both sections.
- [ ] Technical/platform constraints are recorded as cause/constraint evidence, not used to erase a DESIGN_MISMATCH.
- [ ] Chat/HTML/client presentation shows separate **Bugs** and **Design Mismatches** sections.

## Flow-order review

Review the audit in the same order the player experiences the game:

- [ ] ENTRY / JOIN — entry, membership, assignment, queue/capacity, player-local/shared state.
- [ ] READY / START — ready state, countdown, final revalidation, parallel start, cinematic/input ownership.
- [ ] SETUP — loadout, structures, teleports, objectives, chunk/ticking readiness, previous-run residue.
- [ ] ACTIVE GAMEPLAY — combat, entity AI/navigation, interactions, spatial authority, simulation, multiplayer isolation.
- [ ] PROGRESSION — objectives, waves/levels, score/reward/shop, spawn accounting, transitions, meaningful boundaries.
- [ ] TERMINAL — victory/defeat/death/timeout, terminal collisions, one-time result/reward ownership.
- [ ] CLEANUP / REPLAY — reset, entities, state, inventory, world mutation, leases, delayed work, second-run equivalence.
- [ ] RECOVERY — disconnect/reconnect/reload/retry/owner disappearance return to a valid normal-flow state.
- [ ] Every technical finding is attached to a player-flow stage; no detached domain-only issue remains.

## Core understanding

- [ ] Game Design Reconstruction completed.
- [ ] Gameplay Flow mapped from entry to completion.
- [ ] State transitions reviewed, including alternate and failure exits.
- [ ] Reset and preserve rules identified.
- [ ] Progression rules identified.

## Multiplayer / Multi Arena

- [ ] Multiplayer rules reviewed when applicable.
- [ ] Visible arena count and actual concurrent capacity compared.
- [ ] Capacity boundary and capacity + 1 behavior reviewed.
- [ ] Queue/admission behavior and player feedback reviewed.
- [ ] Simultaneous-start behavior reviewed when multiple arenas exist.
- [ ] Cross-arena isolation reviewed.
- [ ] Cleanup and second-run/reuse behavior reviewed.
- [ ] Replica integrity/completeness reviewed for repeated arenas or repeated map regions.
- [ ] Progressive proof result is explicit: native, voxel, block-entity, actor/tick, or blocked/incomplete.

## Blind-spot gates

- [ ] Hidden limitations / player expectation mismatches reviewed.
- [ ] Softlock paths reviewed.
- [ ] Recovery paths reviewed.
- [ ] Boundary scenarios reviewed.
- [ ] Multiplayer scaling/authority reviewed when applicable.
- [ ] Cross-system interactions reviewed for applicable systems.
- [ ] Race / simultaneous terminal conditions reviewed.
- [ ] Content-contract mechanics verified against actual behavior.
- [ ] Player feedback/observability reviewed for material limitations.
- [ ] Persistence save/reset/restore boundaries reviewed.
- [ ] Spatial containment/world mutation reviewed when applicable.
- [ ] Entity lifecycle/disappearance semantics reviewed when applicable.
- [ ] Inventory/economy/UI/cinematic/effects/permissions reviewed when used.
- [ ] Gameplay-significant performance/platform constraints reviewed when applicable.
- [ ] Prerequisite reachability reviewed for sensitive player-triggerable capabilities.
- [ ] Sensitive capabilities have an explicit authorization/release disposition: blocked, guarded, exposed, potentially-exposed, or unknown.
- [ ] Reachability coverage gaps are not treated as proof of unreachability.
- [ ] Known regression examples were not converted into object/map-specific production rules.

## Coverage accounting

- [ ] Every applicable audit surface has an explicit accounted, blocked, or not-applicable disposition; gameplay causal links use their canonical proof states rather than a generic checked state.
- [ ] Blocked surfaces include a reason.
- [ ] Not-applicable surfaces include a reason.
- [ ] Unsupported/unparsed mechanics are recorded as Detection Gap.
- [ ] Selected artifact remains the only gameplay authority.
- [ ] No archive/old-version evidence was used to infer current gameplay.

## Bug quality

- [ ] Every bug has a Bug ID.
- [ ] Every bug is connected to gameplay flow.
- [ ] Confirmed bugs have player impact.
- [ ] Confirmed bugs have cleared counter-evidence.
- [ ] Confirmed bugs have tester-ready reproduction.
- [ ] Reproduction uses tester language.
- [ ] Expected and Actual behavior are clear.
- [ ] Proof ceiling is recorded.

## Honesty / non-suppression

- [ ] Every material unresolved residue has a visible NEED_VALIDATION finding.
- [ ] Every saturation-complete CONFIRMED_DEFECT_READY causal link has a visible PROVEN finding.
- [ ] Every confirmation-ready causal link that still lacks universal/family proof remains visible as NEED_VALIDATION.
- [ ] Unknown/blocked material surfaces, unaccounted surfaces, incomplete state/boundary closure, unresolved knowledge receipts, runtime/detection gaps, orphan components, shallow scenarios, negative-space signals, and high temporal risks are crosschecked against visible findings.
- [ ] The audit honesty gate reports PASS; any missing visible residue blocks READY_FOR_REVIEW.
- [ ] Only concrete blocking counter-proof may remove a material candidate from the visible finding set.

## Final quality projections

- [ ] Vital Gameplay Knowledge Closure contains exactly the eight canonical vital domains.
- [ ] Every applicable vital domain is terminal as UNDERSTOOD_PROVEN_SAFE, UNDERSTOOD_WITH_FINDING, or NOT_APPLICABLE before the audit is described as fully understood.
- [ ] No RUNTIME_REQUIRED or DETECTION_GAP vital domain is hidden behind a generic PASS/checked label.
- [ ] Tier 0 domains — entry/admission, progression, multi-arena isolation, and connection/recovery — have explicit ownership, interruption, recovery, boundary, and concurrency dispositions.
- [ ] Vital Closure is a projection only; it does not create a second finding lane, state machine, report authority, or manual audit path.
- [ ] Any unrouted material residue keeps Vital Gameplay Knowledge Closure OPEN.
- [ ] Information Integrity projection is not BLOCKED before publication.
- [ ] Every player-facing information contradiction remains represented exactly once in the canonical BUG or DESIGN_MISMATCH lanes.
- [ ] Information Integrity does not create a duplicate issue list or alternate audit authority.
- [ ] When the canonical finding count is zero, Zero-Finding assessment is ELIGIBLE before describing the audit as a closed zero-finding result.
- [ ] Zero-Finding ELIGIBLE requires accounted coverage, CLOSED gameplay closure, PASS honesty, zero Audit Obligations, and zero remaining validation groups.
- [ ] Zero-Finding wording remains bounded to the selected artifact and closed audit coverage; it is never phrased as a universal "bug-free" guarantee.
- [ ] After a repair, Fix Verification Readiness is VERIFIED_FIXED before treating the original issue as closed; NOT_FIXED, REGRESSION_FOUND, and CONFIRMATION_REQUIRED remain open states.
- [ ] Fix Verification Readiness reuses canonical post-repair differential/preservation proof and is not a second repair pipeline.

## Report output

- [ ] Proposed Issue Set review resolved: approved / rejected / needs-discussion.
- [ ] Every material finding is visible as either PROVEN or NEED_VALIDATION; unresolved runtime, ambiguous-intent, insufficient-evidence, and Detection Gap reasons are carried inside NEED_VALIDATION with an exact targeted test.
- [ ] Map Audit Report contains every material PROVEN and NEED_VALIDATION finding.
- [ ] Canonical Bug Report V2 contains approved PROVEN reportable issues only, with each issue classified as `BUG` or `DESIGN_MISMATCH`.
- [ ] Coverage remains recorded in Map Audit Output.
- [ ] Chat preview follows PREVIEW contract.
- [ ] HTML follows Bug Report V2 client layout and uses presentation-only checklists.

## STOP

Do not publish a final report until all applicable surfaces are accounted for. A clean happy path is not sufficient evidence that the audit is complete.


## Conservation / delivery final gate

- [ ] Every material candidate discovered during the run has an explicit final disposition: PROVEN, NEED_VALIDATION, REJECTED_WITH_COUNTERPROOF, SUPERSEDED_BY, or INTENTIONALLY_EXCLUDED with reason.
- [ ] No finding disappeared only because it failed approval/promotion; approval is not a disposition.
- [ ] Material runtime-only residue remains visible as NEED_VALIDATION with one exact deciding test.
- [ ] Every material configured dependency was checked across applicable delivery states: declared → materialized → active → owned → simulated → completed/released.
- [ ] Queued/requested placement is not treated as proof of world materialization.
- [ ] Declared ticking/chunk configuration is not treated as proof of runtime residency.
- [ ] Effective player throughput was derived independently from arena count, party/session limits, concurrency caps, per-arena capacity, and runtime resource limits.
- [ ] Every terminal path was checked for same-tick/adjacent-tick collision and exactly-once result/reward/cleanup ownership.
- [ ] Current artifact version identity was reconciled across filename, manifests, world/level labels, exports/results, and report binding where present.
- [ ] Deprecated calls, dormant debug paths, and hardcoded arena/session IDs have explicit reachability/materiality dispositions; they are neither auto-promoted nor silently discarded.
- [ ] Final conservation equation balances: all material candidates = visible findings + explicit non-finding dispositions.
