---
name: m-bedrock-map-bug-audit
description: >
  Audit one Minecraft Bedrock/Education map for gameplay bugs using stable detection capability. Design-first; no detector development or target repair.
---

# M-Bedrock Map Bug Audit

**Lane:** OPERATIONAL / MAP USE

## Entry

Use for bug finding, retest, or defect classification.

## Required order

```text
Target Identity
→ Game Design
→ Gameplay Contract
→ Design Readiness
→ Actual Behavior
→ Contradiction
→ Counter-Evidence
→ Player Impact
→ Tester Trigger
→ Proposed Bug Set
→ Chat Approval
```

No Game Design understanding → no gameplay bug search.

## Design readiness

- `READY` — material rules grounded.
- `PARTIAL` — unresolved rules exist but cannot change this scoped decision.
- `BLOCKED` — a material unknown/conflict can change bug-vs-feature classification.

Only `READY` or scoped-safe `PARTIAL` may continue.

Gameplay Contract is a scoped derived view of approved Game Design, not a second authority.

## Bug admission

A reportable bug requires all of:

1. grounded gameplay contradiction;
2. counter-evidence cleared;
3. material player-visible impact;
4. tester-verifiable in-game trigger.

Technical anomaly, metadata drift, unusual code, or historical QA alone is not a gameplay bug.

Severity is assigned only after admission:
- Blocker — required gameplay cannot normally start/continue/complete and normal recovery is unavailable;
- Major — core gameplay/state/fairness is materially wrong but normal continuation/recovery remains;
- Minor — limited impact; hidden by default.

## Review boundary

```text
Proposed Bug Set
→ approve | reject | needs-discussion
→ Approved Bug Set
→ Bug Report V2
→ HTML
```

Missing decision or `needs-discussion` blocks publication. No approved bugs means no HTML.

## Forbidden

- infer Game Design from source code;
- mutate target or detector;
- severity-score non-defects;
- publish before chat approval.

## Output

Validate against `../../schemas/map-audit-output.schema.json`.

Normal preview: Blocker/Major only, player-facing Issue + Bug Trigger. Technical detail stays internal unless requested.

## Handoff

- detection gap → `m-bedrock-detection-development`
- approved bug needing mutation → `m-bedrock-target-repair`
- runtime-only residue → runtime/manual validation

## Canonical references

- `../../../docs/01-product/flow.md`
- `references/finding-contract.md`
- `../../../engine/packages/bug-report/COPY.md`
- `../../../engine/packages/bug-report/PREVIEW.md`

## STOP

Stop when every in-scope candidate has a disposition and all unresolved material design questions are explicit.
