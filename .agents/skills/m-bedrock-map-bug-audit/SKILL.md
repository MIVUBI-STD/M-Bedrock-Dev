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
Tested Version: Latest Education

Open Issues: <count>
Blocker: <count> · Major: <count> · Minor: <count>
```

Do not show Repair By, repair ownership, or Fixed progress during normal bug-finding preview.

Normal ChatGPT preview uses one compact table:

```text
No. | Severity | Bug | Issue | Action
```

Rules:

- do not create one vertical section per bug by default;
- keep one row per bug;
- use `#1`, `#2`, ... for preview references and keep canonical Bug ID hidden unless detail/full mode is requested;
- do not invent Action when Suggested Fix is absent;
- hide fixed bugs unless requested;
- do not show Expected / Observed / Reproduction / technical fields unless the user requests detail;
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
