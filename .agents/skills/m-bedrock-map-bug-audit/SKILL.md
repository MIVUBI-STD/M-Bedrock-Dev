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
→ Discovered-Surface Accounting
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

A confirmed defect requires:

1. grounded contradiction inside the selected version;
2. counter-evidence cleared;
3. player-visible impact (`blocking`, `material`, or `limited`);
4. tester-verifiable in-game trigger.

Technical anomaly, metadata drift, historical QA, or behavior from another version is not enough for confirmed-defect status.

Severity is assigned only after confirmation:
- Blocker — required gameplay cannot normally start/continue/complete and normal recovery is unavailable;
- Major — core gameplay/state/fairness is materially wrong but normal continuation/recovery remains;
- Minor — limited but real player-visible impact.

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
- assign Blocker/Major/Minor severity to unconfirmed candidates;
- publish before chat approval.

## Output

Validate against `../../schemas/map-audit-output.schema.json`.

Normal preview includes every detected issue worth tester attention, not only confirmed defects.

### Chat output contract

Keep normal/healthy surfaces hidden. Show all detected issue candidates that could still represent a real defect.

For confirmed defects:

```text
[Blocker | Major | Minor] — Confirmed

Issue:
<player-facing failure>

Bug Trigger:
<concise tester-verifiable trigger>
```

For unresolved issue candidates:

```text
[Needs Validation | Ambiguous | Detection Gap]

Issue:
<concise suspected player-facing failure or risk>

Bug Trigger:
<best available trigger/path>

Reason:
<one concise sentence explaining what remains unproven>
```

Do not hide an issue merely because it is not yet confirmed.

Do not expose by default:
- checked/normal gameplay surfaces;
- designed-behavior candidates;
- rejected candidates that have been disproven;
- coverage statistics;
- internal proof bookkeeping;
- analyzer reasoning or discovery notes.

Mapping for unresolved status:
- `runtime-proof-required` or `insufficient-evidence` → `Needs Validation`;
- `ambiguous-intent` → `Ambiguous`;
- `detection-gap` → `Detection Gap`.

If no confirmed or unresolved issue candidate remains, output only:

```text
No detected issues.
```

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