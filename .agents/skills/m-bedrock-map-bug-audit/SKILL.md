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
→ Gameplay Contract
→ Actual Behavior
→ Contradiction
→ Counter-Evidence
→ Player Impact
→ Tester Trigger
→ Proposed Bug Set
→ Chat Approval
```

Expected Behavior and Actual Behavior must come from the same selected artifact.

If the artifact cannot ground a material expected behavior, mark that scope `BLOCKED / ambiguous`; do not borrow intent from stale sources.

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

Normal preview: Blocker/Major only, player-facing Issue + Bug Trigger.

## Handoff

- detection gap → `m-bedrock-detection-development`
- approved bug needing mutation → `m-bedrock-target-repair`
- runtime-only residue → runtime/manual validation

## Canonical references

- `../../../docs/01-product/flow.md`
- `../../../docs/06-system/drive-storage.md`
- `references/finding-contract.md`

## STOP

Stop when every in-scope candidate has a disposition and unresolved material rules remain explicit.