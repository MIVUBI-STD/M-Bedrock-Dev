---
id: document.repair.repair-planning
class: DOCUMENT
domain: repair
role: REFERENCE
authority: CANONICAL
lifecycle: ACTIVE
---

# Repair Planning

## Purpose

Repair planning may derive deterministic proposals from inspection/diagnosis, but a proposal never authorizes mutation.

## Proposal states

```text
proposal
unsupported
unavailable
```

- `proposal` — a deterministic candidate transform exists for later review.
- `unsupported` — the current repair engine cannot safely represent the transform.
- `unavailable` — required evidence is missing in the current context.

## Authority boundary

```text
inspect / diagnose
→ deterministic repair proposal
→ STOP

Approved Bug / approved intentional change
→ Repair Contract
   ├─ Must Change
   └─ Must Preserve
→ authorized PatchTransaction
→ current fingerprint / exact source preconditions
→ working-copy mutation
→ validation
→ preservation verification
```

Mechanical transformability never substitutes for Gameplay Contract understanding or explicit repair authority.

## Typed repair inputs

Repair planning consumes typed semantic effects rather than blind string replacement.

Examples:

```text
FillEffect
→ region
→ block
→ mode
→ source evidence

TeleportEffect
→ target
→ destination
→ source evidence
```

Typed inputs allow a proposal to preserve command shape, source evidence, and explicit preconditions.

## Topology proposal boundary

A topology proposal may be derived when evidence supports a deterministic transform, such as a strongly evidenced linear outlier in an absolute-coordinate fill/setblock with exact source evidence.

Keep unsupported without guessing when the transform depends on:
- relative/local coordinates;
- nested execute context that would be lost;
- ambiguous/multi-line source;
- non-linear topology;
- broader state-scope meaning not represented by the repair primitive.

## Context preservation

A nested spatial effect inside `execute ... run` must remain unsupported when replacing only the nested command would discard selector, condition, dimension, position, rotation, or other execution context.

## Fingerprints

Fingerprints and source references make proposals precise. They never grant mutation authority.