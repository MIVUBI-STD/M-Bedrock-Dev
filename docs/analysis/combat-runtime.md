# Damage, Combat, Friendly Fire, and Attribution

## Core problem

A damage event is not equivalent to:

```text
valid attacker
same arena
enemy team
current round
valid projectile owner
kill credit
```

These are separate proofs.

## Damage attribution envelope

```text
victim
victim lifeGeneration
damage cause
damagingEntity?
damagingProjectile?
projectile owner?
attacker arena/team
victim arena/team
arenaGeneration
combatGeneration
projectileGeneration
```

## Direct vs projectile damage

For projectile hits, do not rely only on the projectile entity.

Correlate projectile -> owner -> current owner generation -> current arena/team scope.

A projectile can remain in flight after the shooter or arena state changes.

## Friendly fire

Global pvp=false is coarse world policy. Multi-arena gameplay may need different combat rules per arena, so arena/team policy remains project-owned.

## Combat lifecycle

```text
damage candidate
↓
scope + attribution validation
↓
hurt
↓
project life/downed rules
↓
death confirmed
↓
kill/assist attribution
↓
idempotent score/reward commit
```

## Stale projectile hazard

```text
Round 10 player fires arrow
↓
round reset
↓
Round 11 begins
↓
old arrow hits player
```

The engine hit may be real while gameplay attribution is stale.

## Environmental damage

Damage without a valid player/entity attacker remains environment-attributed unless the mode explicitly defines another rule.

## Secondary effects

Damage policy and knockback, impulse, fire, status effects, projectile block damage, revive interruption, and objective triggers are separate policy surfaces.

## Analyzer diagnostics

- COMBAT_ATTRIBUTION_INCOMPLETE
- COMBAT_ATTACKER_STALE
- COMBAT_PROJECTILE_OWNER_MISSING
- COMBAT_PROJECTILE_STALE_GENERATION
- COMBAT_CROSS_ARENA_DAMAGE
- COMBAT_FRIENDLY_FIRE_POLICY_UNDECLARED
- COMBAT_GLOBAL_PVP_RULE_CONFLICT
- COMBAT_ENVIRONMENT_DAMAGE_MISATTRIBUTED
- COMBAT_HURT_TREATED_AS_KILL
- COMBAT_KILL_CREDIT_BEFORE_DEATH
- COMBAT_DUPLICATE_KILL_SCORE
- COMBAT_STALE_ASSIST
- COMBAT_PROJECTILE_NOT_CLEANED_ON_RESET
- COMBAT_DAMAGE_BLOCKED_BUT_SIDE_EFFECT_APPLIED
- COMBAT_FRIENDLY_KNOCKBACK_LEAK
- COMBAT_PROJECTILE_WORLD_MUTATION_POLICY_MISSING

## Review questions

1. What is the exact damage cause?
2. Is there a direct damaging entity?
3. Is there a projectile?
4. Who owns the projectile?
5. Is the owner still current?
6. Are attacker and victim in compatible arena/team scope?
7. Is the projectile from the current round?
8. Is this hurt or terminal death?
9. Is score/reward idempotent?
10. Are knockback/status/block-damage effects governed by the same intended policy?