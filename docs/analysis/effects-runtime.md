# Effects, Attributes, Buff-Debuff, and Component Mutation Integrity

## Core problem

Gameplay state can be hidden in multiple runtime surfaces:

```text
status effects
current health
max health
movement/combat attributes
entity properties
component groups
equipment-derived modifiers
fire / immunity / temporary state
```

A reset that only clears tags or scoreboards can still leave the player/entity mechanically altered.

## Baseline contract

Each gameplay role should define expected baseline for:

- active status effects
- current/max health semantics
- movement/combat modifiers
- active project properties
- component-group-driven behavior
- equipment-derived modifiers

## Component-group hazard

Adding a group can replace a component of the same type. Re-adding an active group can reinitialize stateful components such as timers.

Therefore:

```text
add component group
!=
harmless append
```

## Delayed mutation

Entity-event changes to properties/component groups are queued and may only become observable when the entity ticks.

Use:

```text
trigger event
↓
mutation queued
↓
entity ticks
↓
verify expected state
↓
dependent gameplay
```

not immediate same-tick read-after-write assumptions.

## Health reconciliation

If max health changes, define current-health policy explicitly:

- clamp to new max
- preserve ratio
- reset to max
- preserve current absolute value

This is especially important for downed/revive/respawn transitions.

## Temporary modifier ownership

Effects/buffs should carry logical owners such as:

```text
arena setup
revive immunity
downed slow
kit bonus
objective buff
cutscene lock
```

If two owners contribute the same logical modifier, removing one must not silently erase the other.

## Reset integration

Arena cleanup/player normal form should reconcile:

- status effects
- health/max-health
- properties
- component groups
- attribute overrides
- fire/immunity state
- equipment-derived modifiers

## Analyzer diagnostics

- EFFECT_STATUS_LEAK_ACROSS_ROUND
- EFFECT_OWNER_MISSING
- EFFECT_OWNER_REMOVE_CONFLICT
- EFFECT_MAX_HEALTH_CURRENT_HEALTH_DESYNC
- EFFECT_COMPONENT_GROUP_REINITIALIZED
- EFFECT_COMPONENT_GROUP_DUPLICATE_TRIGGER
- EFFECT_COMPONENT_REPLACEMENT_UNACCOUNTED
- EFFECT_EVENT_MUTATION_READ_TOO_EARLY
- EFFECT_TEMPORARY_PROPERTY_NOT_RESET
- EFFECT_RESPAWN_POLICY_UNDECLARED
- EFFECT_REVIVE_DEBUFF_LEAK
- EFFECT_MULTIPLE_AUTHORITIES
- EFFECT_STACKING_POLICY_UNDECLARED
- EFFECT_BASELINE_UNVERIFIED

## Review questions

1. What mechanic owns this buff/debuff?
2. What generation owns it?
3. Is it represented by effect, property, component group, equipment, or several at once?
4. Can re-adding the component group restart stateful logic?
5. Is the mutation observable immediately or only after entity tick?
6. What happens to current health when max health changes?
7. Can two systems apply the same logical modifier?
8. Does respawn/revive clear or preserve it?
9. Does arena reset restore the baseline?
10. Is post-reset effect/attribute state actually verified?