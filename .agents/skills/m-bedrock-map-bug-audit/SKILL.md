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

Expected behavior authority → cheapest sufficient evidence → actual behavior/effect → compare → disposition → severity if defect → residue/handoff.

Use the evidence ladder in ../../references/evidence-cost-ladder.md; do not escalate evidence cost without need.

## Output contract

Validate structured output against ../../schemas/map-audit-output.schema.json.

Optional deterministic validation: node scripts/validate-output.mjs audit.json

Every candidate must end in one disposition: defect, designed-behavior, ambiguous-intent, insufficient-evidence, runtime-proof-required, or detection-gap.

### ChatGPT report preview

When presenting a confirmed Bug Report V2 to a user, do not dump canonical JSON by default.

Use the canonical report contracts:

- `../../../engine/packages/bug-report/COPY.md` for wording quality;
- `../../../engine/packages/bug-report/PREVIEW.md` for presentation.

Default presentation is `standard`, open-bugs-only, and **table-first**.

Audit header is fixed:

```text
Map Version: <map version>
Tested Version: Minecraft Education <exact version> (Latest)

Open Issues: <count>
Blocker: <count> · Major: <count> · Minor: <count>
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
