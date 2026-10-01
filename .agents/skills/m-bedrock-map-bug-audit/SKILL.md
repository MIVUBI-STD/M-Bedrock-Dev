---
name: m-bedrock-map-bug-audit
description: >
  Audit one Minecraft Bedrock/Education map version for gameplay bugs using stable detection capability. Selected-version-only; no detector development or target repair.
---

# M-Bedrock Map Bug Audit

**Lane:** OPERATIONAL / MAP USE

## Source of truth

Audit exactly one selected `.mcworld`.

Default target = the single current `.mcworld` in that map root. If the user explicitly selects another version, that exact file is the target.

That selected map version is the **only current gameplay source of truth**.

Do not use older versions, Development/Source, old QA/Bug Reports, Technical Docs, changelogs, other maps, or external design documents to infer current mechanics. They are archive/reference only unless comparison/history is explicitly requested.

## Workflow

```text
Selected Map Version
→ Gameplay Surface Inventory
→ Gameplay Contract
→ Actual Behavior
→ Coverage Check
→ Contradiction
→ Counter-Evidence
→ Player Impact
→ Tester Trigger
→ Proposed Bug Set
→ Chat Approval
```

Expected Behavior and Actual Behavior must come from the same selected artifact.

Before finishing the audit, every **discovered** gameplay surface must be explicitly marked `checked`, `blocked`, or `not-applicable`. Silent omission is not allowed. This accounting does not prove that undiscovered mechanics do not exist.

If the artifact cannot ground a material expected behavior, mark that scope `BLOCKED / ambiguous`; do not borrow intent from stale sources.

## Discovery rule

Primary discovery is generic:

```text
Gameplay Contract
≠
Actual Behavior
→ contract contradiction
```

Candidate families are tags for grouping/prioritization, not a whitelist of what may be found. A bug must not be missed merely because it does not fit a named family.

## Bug admission

A reportable bug requires:

1. grounded contradiction inside the selected version;
2. counter-evidence cleared;
3. material player-visible impact;
4. tester-verifiable in-game trigger.

Technical anomaly, metadata drift, historical QA, or behavior from another version is not enough.

Severity is assigned only after admission:
- Blocker — required gameplay cannot normally start/continue/complete and normal recovery is unavailable;
- Major — core gameplay/state/fairness is materially wrong but normal continuation/recovery remains;
- Minor — limited impact; hidden by default.

## Review

```text
Proposed Bug Set
→ approve | reject | needs-discussion
→ Approved Bug Set
→ Bug Report V2
→ HTML
```

Missing decision or `needs-discussion` blocks publication. No approved bugs means no HTML.

## Forbidden

- mix evidence from different map versions;
- use external/stale docs as current gameplay authority;
- mutate target or detector;
- severity-score non-defects;
- publish before chat approval.

## Output

Validate against `../../schemas/map-audit-output.schema.json`.

Normal preview: Blocker/Major only, player-facing Issue + Bug Trigger. Keep the per-surface accounting internal unless the user asks for audit completeness/detail.

### Chat output contract

Default user-facing audit output is intentionally minimal.

Show **only confirmed Blocker/Major defects**. For each defect, output exactly:

```text
[Severity]

Issue:
<player-facing failure>

Bug Trigger:
<concise tester-verifiable trigger>
```

Do not expose by default:
- checked/normal gameplay surfaces;
- rejected candidates;
- ambiguous-intent candidates;
- insufficient-evidence candidates;
- runtime-proof residue;
- detection gaps;
- metadata-only/non-gameplay defects;
- coverage statistics;
- internal proof bookkeeping;
- candidate IDs;
- analyzer reasoning or discovery notes.

If no reportable Blocker/Major defect is confirmed, output only:

```text
No Blocker/Major bugs confirmed.
```

Expose internal audit detail only when the user explicitly asks for audit completeness, technical evidence, or debugging detail.

## Handoff

- detection gap → `m-bedrock-detection-development`
- approved bug needing mutation → `m-bedrock-target-repair`
- runtime-only residue → runtime/manual validation

## Canonical references

- `../../../docs/01-product/flow.md`
- `../../../docs/06-system/drive-storage.md`
- `references/finding-contract.md`

## STOP

Stop only when every discovered gameplay surface has one accounting record, every candidate has one disposition, and every blocked scope has a concise reason.