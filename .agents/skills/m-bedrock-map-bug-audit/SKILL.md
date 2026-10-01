---
name: m-bedrock-map-bug-audit
description: >
  Audit a target Minecraft Bedrock/Education map for gameplay defects using existing stable detection capability. Use for bug finding, retest, and defect classification; not detector development.
---

# M-Bedrock Map Bug Audit

**Lane:** OPERATIONAL / MAP USE

## Purpose

Use current stable detection capability to classify map-specific gameplay candidates without changing the detector.

## Entry criteria

Use for bug finding, retest, suspected gameplay issues, or Blocker/Major/Minor classification on a target map.

## Allowed actions

- inspect target identity/design/intent/evidence;
- run existing analyzers and current Platform Knowledge / Rules;
- compare Behavior Contracts;
- classify findings and proof ceilings;
- emit detection-gap or runtime/manual residue.

## Forbidden actions

- change detection capability;
- mutate the original artifact;
- convert unsupported analysis into a defect;
- silently switch to Detection Development.

## Workflow

Expected behavior authority → cheapest sufficient evidence → actual behavior/effect → intent/design gate → player-visible impact gate → tester-verifiable in-game trigger gate → disposition → severity only if reportable defect → residue/handoff.

Use the evidence ladder in ../../references/evidence-cost-ladder.md; do not escalate evidence cost without need.

## Bug vs feature gate

A suspicious implementation pattern is not a bug by itself.

Before a candidate can become a tester-facing defect:

1. Intent must be grounded. If current Game Design or authored intent explicitly allows the behavior, classify it as designed-behavior. If intent is not uniquely grounded, classify it as ambiguous-intent. Only a grounded contradiction may continue toward a bug.
2. The player must experience a material consequence. Technical-only anomalies, metadata drift, stale internal state, unusual callbacks, or implementation complexity are not reportable unless they produce a player-visible gameplay failure.
3. The failure must have an in-game proof path. The tester must be able to perform player actions and observe the wrong result. If the path requires code, logs, or internal state, the finding is not tester-ready.
4. Default report threshold is Blocker or Major. Minor findings remain canonical only when useful, but stay hidden unless explicitly requested.

Use classifyBugCandidate() and classifyBugSeverity() from the canonical bug-report package when constructing or reporting a candidate.

## Candidate discovery and counter-evidence

Before proposing a bug, search both for evidence that supports the failure and evidence that would explain or permit it.

Preferred candidate families are bounded to gameplay-critical patterns:

- progression dead-end;
- objective loss;
- reset leakage;
- terminal-state conflict;
- multiplayer ownership conflict;
- critical inventory loss;
- entity route dead-end.

Do not add a new candidate family for one map-specific symptom when an existing family can represent it.

Counter-evidence handling is fail-closed:

- counter-evidence present -> suppress or reclassify;
- counter-evidence unresolved -> keep as internal unresolved candidate;
- counter-evidence cleared -> candidate may continue;
- historical bug reports count only as search hints, never as counter-evidence or current defect proof by themselves.

A candidate must still pass intent, player-impact, and in-game-trigger gates before becoming tester-facing.

## Chat approval boundary

Normal map audit delivery stops for review before artifact generation.

```text
candidate discovery
→ intent / counter-evidence / player-impact gates
→ Proposed Bug Set
→ chat discussion
→ explicit approve / reject / needs-discussion
→ Approved Bug Set
→ canonical Bug Report V2
→ HTML
```

Rules:

- present Blocker/Major proposed bugs first;
- Issue wording stays player-facing;
- show contract violated, not internal proof plumbing;
- optionally show Suppressed as Game Design and Needs Discussion when they materially help review;
- a missing decision blocks publication;
- needs-discussion blocks publication;
- rejected bugs never enter Bug Report V2;
- if no bugs are approved, do not create HTML;
- do not regenerate HTML during discussion; publish once after approval.

Use projectProposedBugSet(), applyProposedBugReview(), and buildBugReportFromApprovedBugSet() for the normal approval-gated route.

## Severity

Severity is based on player consequence and recovery, not technical complexity.

- Blocker: match/gameplay cannot start, mandatory objective/progression cannot continue, the game crashes/freezes, or recovery requires leaving/restarting outside normal gameplay.
- Major: core gameplay, important player state, or fairness is materially wrong, but the session can still continue or recover through normal play.
- Minor: limited player-visible impact that does not materially affect core gameplay. Hidden from default output.

Do not escalate severity merely because the implementation looks risky or touches many systems.

## Output contract

Validate structured output against ../../schemas/map-audit-output.schema.json.

Optional deterministic validation: node scripts/validate-output.mjs audit.json

Every candidate must end in one disposition: defect, designed-behavior, ambiguous-intent, insufficient-evidence, runtime-proof-required, or detection-gap.

### ChatGPT report preview

When presenting a confirmed Bug Report V2 to a user, do not dump canonical JSON by default.

Use the canonical report contracts:

- `../../../engine/packages/bug-report/COPY.md` for wording quality;
- `../../../engine/packages/bug-report/PREVIEW.md` for presentation.

Default presentation is standard, open bugs only, Blocker/Major only, and **table-first**.

Audit header is fixed:

```text
Map Version: <map version>
Tested Version: Minecraft Education <exact version> (Latest)

Open Issues: <count>
Blocker: <count> · Major: <count>
```

Before claiming `(Latest)`, verify the current Minecraft Education version from an official Minecraft Education source and ensure the audit's canonical `testedVersion` matches that exact build. If freshness cannot be verified, show the exact tested version without `(Latest)`.

Do not show Repair By, repair ownership, or Fixed progress during normal bug-finding preview.

Normal ChatGPT preview uses one compact two-column table per bug:

```text
#1 · BLOCKER | Bug title
Issue | what is wrong + gameplay impact
Bug Trigger (In-Game) | exact player actions + visible wrong result
Solution | supported change
```

Rules:

- keep one compact two-column block per bug;
- Issue must describe what the player experiences and the gameplay impact, never the technical mechanism;
- if a technical finding cannot be translated into a concrete player-visible failure, keep it internal;
- do not split one bug across distant sections;
- use `#1`, `#2`, ... for preview references and keep canonical Bug ID hidden unless detail/full mode is requested;
- every tester-facing bug must include a concise `Bug Trigger (In-Game)` path written only as player actions, game states, locations, objects, UI interactions, and visible outcomes;
- for AI-found defects, author the trigger through evidence-bound `BugTriggerDraft` / `compileBugTrigger()`; do not write raw reproduction arrays from technical prose;
- declare `gameplayBasis`: use `authored-gameplay` for grounded game-design/intent flow or `runtime-gameplay` for grounded runtime observation;
- static AI findings may not claim `runtime-gameplay`;
- every AI trigger evidence ID must belong to the same confirmed-defect evidence universe, and at least one must support the declared gameplay basis;
- include required starting context when relevant: player count, location/arena, game phase, team/role, required item, prerequisite state;
- the final trigger step must explicitly state the visible wrong result that proves the bug;
- reproduction must never ask the tester to inspect scripts, functions, variables, source files, logs, or architecture;
- if no tester-verifiable in-game path exists yet, keep the finding internal rather than presenting it as a ready bug;
- do not invent Solution when Suggested Fix is absent;
- hide fixed bugs unless requested;
- hide Minor issues unless requested;
- place `Bug Trigger (In-Game)` directly below Issue and above Solution;
- render every trigger step on a separate numbered line; do not use arrow-chained inline steps;
- do not show Expected / Observed / technical fields unless the user requests detail;
- never expose internal proof plumbing, semantic keys, evidence graph IDs, repair-unit IDs, cache state, or orchestration data in normal report preview;
- use `full` only when the user asks for root-cause or implementation detail.

## Handoff

- detection-gap → record handoff for m-bedrock-detection-development;
- grounded target defect requiring mutation → m-bedrock-target-repair;
- runtime-only residue → explicit manual/runtime validation.

A handoff never executes the next lane automatically.

## Reference routing

- references/finding-contract.md
- references/manual-checks.md
- references/known-limits.md
- references/generated-known-limits.md
- ../../references/evidence-cost-ladder.md
- ../../../engine/packages/bug-report/COPY.md
- ../../../engine/packages/bug-report/PREVIEW.md

## STOP

Stop when every in-scope candidate has a disposition, proof ceiling, severity when applicable, and explicit residue/handoff.
