# Gameplay Model Closure Contract

## Purpose

Bug discovery must not begin until the selected world has a sufficiently closed gameplay model.

The goal is not to prove every runtime outcome before auditing. The goal is to ensure every gameplay-relevant surface is discovered, understood enough to reason about, or explicitly marked blocked/unknown.

## Core principle

Do not infer game design from implementation details alone.

Use this direction:

```text
Player-visible surface
→ gameplay purpose
→ expected contract
→ state / ownership / boundary rules
→ implementation
→ actual behavior
```

Not:

```text
implementation detail
→ assumed design
```

## Discovery independence rule

Surface discovery and closure accounting must be independent operations.

A surface is discovered from raw selected-artifact evidence. It is only considered accounted after the gameplay model provides an understood, blocked, unknown, or not-applicable disposition.

Never construct the discovered-surface list from the already-accounted surface list. That would hide missing analysis by definition.

## Phase A — Surface inventory

Before bug discovery, inventory all gameplay-relevant surfaces visible or consequential to the player.

Typical surfaces include:

- lobby / entry;
- join/ready/start mechanisms;
- arenas / regions / fronts / routes;
- objectives / flags / targets;
- levels / waves / checkpoints;
- enemies / NPC roles / abilities;
- items / kits / upgrades / shops;
- score / currency / rewards;
- death / downed / revive / respawn;
- retry / defeat / victory;
- queue / capacity / concurrency;
- UI / forms / indicators / feedback;
- cinematics / teleport / input locks;
- persistence / reconnect / reload;
- structures / world mutation / cleanup;
- reusable arena/session state.

A surface may be discovered from scripts, behavior/resource packs, structures, world data, scoreboards, tags, commands, UI, entities, or player-facing world elements.

## Phase B — Surface contract

For each discovered surface, record:

- what it is;
- why it exists;
- who can use or own it;
- when it is available;
- entry condition;
- active state;
- success/exit condition;
- failure/abort condition;
- reset rule;
- preserve/persistence rule;
- player-visible feedback;
- dependencies;
- relevant boundaries/limits;
- concurrent/coexisting systems.

If one of these cannot be grounded, record it as unknown rather than silently assuming normal behavior.

## Phase C — Gameplay state model

Build the complete major-state model, including:

- happy-path transitions;
- failure transitions;
- retry transitions;
- disconnect/reconnect;
- reload/recovery;
- player leave;
- simultaneous events;
- cleanup;
- second-run/reuse.

Every major state must have known or explicitly unresolved exits.

## Phase D — Rule closure

For each declared mechanic, prove the chain far enough to establish whether the mechanic actually exists:

```text
Declared
→ Reachable
→ Triggered
→ Consumed
→ Effect Applied
→ Player-visible result
```

A label, tag, config value, entity variant, item name, or comment is not proof that the mechanic works.

## Phase E — Boundary extraction

Extract material numeric or discrete limits, for example:

- arena count;
- concurrent arena count;
- party size;
- retry count;
- level count;
- wave count;
- timer values;
- front/route count;
- score/reward thresholds.

For applicable limits, reason about:

```text
0
1
max-1
max
max+1
```

Use only meaningful cases; do not generate wasteful tests where a boundary is irrelevant.

## Phase F — Coexistence model

Record systems that can be active at the same time or invalidate one another.

Use the cross-system interaction audit for high-risk pairs.

## Closure states

Each gameplay surface must end as one of:

- understood;
- blocked;
- unknown/detection-gap;
- not-applicable.

No discovered surface may disappear from accounting.

## Closure gate

Gameplay model status is:

- CLOSED — every discovered surface is accounted for and all material core mechanics are understood enough to begin contradiction analysis;
- PARTIAL — all surfaces are accounted for, but one or more material surfaces are blocked/unknown;
- OPEN — discovered surfaces remain unaccounted or the player journey/state model is incomplete.

### Bug-discovery rule

- CLOSED: normal bug discovery may begin.
- PARTIAL: bug discovery may proceed only for understood surfaces; blocked/unknown surfaces remain explicit Detection Gaps or Ambiguous items.
- OPEN: do not claim comprehensive bug coverage and do not finalize the audit.

## Anti-false-confidence rules

- No evidence of a bug is not evidence of correctness.
- Existing code is not proof of intended design.
- Existing queue/limit/configuration is not proof that the limitation is intended.
- A successful happy path is not proof that alternate paths are safe.
- A mechanic name is not proof that its effect is implemented.
- Physical availability is not proof of concurrent playability.
- Unknown must never be converted into Designed Behavior without grounding.
