# State Authority and Data Consistency

## Goal

A Bedrock map can have multiple technically valid state surfaces that disagree:

```text
scoreboard      = ready
tag             = not_ready
dynamicProperty = ready
script memory   = disconnected
inventory       = old loadout
arena registry  = not assigned
```

The analyzer must identify which surface owns truth.

## Authority map

For every logical concept define:

```text
concept
authority
scope
durability
revision/generation
mirrors
replication direction
reset rule
reconciliation rule
```

Example:

```text
readyState
  authority: arena participant registry
  scope: arenaGeneration + participationGeneration
  durability: transient
  mirrors:
    - scoreboard.ready
    - tag:mivubi_ready
  direction:
    registry -> scoreboard/tag
```

The scoreboard and tag can be stale while the registry remains correct.

## State classes

### Transient session

Examples:
- current ready state
- pending revive owner
- open form
- loader/spectator duty
- current countdown participation

Never restore blindly after reconnect.

### Round scoped

Examples:
- kills this round
- alive/downed/dead
- checkpoint
- temporary kit state

Must reset on round generation change.

### Arena scoped

Examples:
- arena lifecycle phase
- participant membership
- countdown owner
- active enemy registry

### Player durable

Examples:
- persistent progression
- unlocks
- durable preferences

### World durable

Examples:
- world configuration
- migration version
- persistent global progression

## Split-brain pattern

```text
Authority revision 42 = NOT_READY

scoreboard mirror rev 41 = READY
tag mirror rev 42 = NOT_READY
script cache rev 40 = READY
```

Correct response:

```text
use authority rev 42
detect scoreboard/script drift
repair mirrors
do not vote/majority-select values
```

## Critical rules

1. Exactly one owner for each concept.
2. Mirrors do not independently decide truth.
3. Persisted state is not automatically session authority.
4. Display state must not become gameplay authority accidentally.
5. Resets clear all scoped mirrors.
6. Unknown conflicts fail closed for critical gameplay.
7. Stale writers are rejected using revision/generation.
8. Reconcile on world/player/arena/round bootstrap boundaries.

## Analyzer diagnostics

- STATE_MULTIPLE_AUTHORITIES
- STATE_AUTHORITY_UNDECLARED
- STATE_MIRROR_READ_AS_AUTHORITY
- STATE_SCOREBOARD_GHOST_PARTICIPANT
- STATE_TAG_SCOREBOARD_DRIFT
- STATE_DYNAMIC_PROPERTY_SESSION_LEAK
- STATE_STALE_REVISION_WRITE
- STATE_PARTIAL_MIRROR_UPDATE
- STATE_RESET_LEFT_GHOST_MIRROR
- STATE_CONFLICT_UNRESOLVED
- STATE_DURABILITY_SCOPE_MISMATCH
- STATE_INVENTORY_USED_AS_SESSION_AUTHORITY
- STATE_RUNTIME_HANDLE_INVALID

## Review questions

1. What exact concept does this field represent?
2. Who owns truth for it?
3. Is this value transient or durable?
4. What generation/revision owns it?
5. Which systems mirror it?
6. Can a mirror outlive its authority?
7. What happens on disconnect/reconnect?
8. What happens on round reset?
9. Is a UI/display field read back into gameplay control flow?
10. If two surfaces disagree, which one wins and why?
