# Entity AI, Navigation, and Pathfinding Runtime Integrity

## Core problem

A living entity that does not move is not automatically a pathfinding bug.

Possible causes:

```text
NO_TARGET
GOAL_NOT_RUNNING
GOAL_STARVED
NAV_COMPONENT_MISSING
MOVEMENT_COMPONENT_MISSING
PATH_UNREACHABLE
ROUTE_GEOMETRY_BROKEN
CROWD_CONGESTION
CHUNK_NOT_READY
ENTITY_STALE
RECOVERY_CALLBACK_STALE
```

## AI stack contract

For every path-dependent gameplay entity define:

```text
movement component
navigation component
target acquisition
movement/attack goals
priority order
control flags
route/environment requirements
recovery policy
```

## Diagnostic order

Do not start with "teleport stuck mob".

Use:

```text
entity resident?
↓
target exists?
↓
movement/navigation stack valid?
↓
intended goal running / not starved?
↓
route geometry valid?
↓
environment compatible with navigation?
↓
progress observed?
↓
bounded recovery
↓
teleport fallback only if necessary
```

## Route corridor contract

Authored paths such as bridges, lanes, gates, and corridors should define:

- entry anchor
- exit/objective anchor
- minimum passable width
- minimum passable height
- support-floor requirement
- allowed jump/drop profile
- door/gate states
- water/hazard policy
- forbidden blocks
- transformed structure bounds if applicable

This lets world-mutation verification detect geometry regressions before mobs are blamed.

## Crowd congestion

A route that works for one entity may fail operationally for twenty.

Distinguish:

```text
STATIC_BLOCKED
CAPABILITY_UNREACHABLE
DYNAMIC_CONGESTION
GOAL_STARVATION
```

## Stuck state machine

```text
MOVING
↓ insufficient progress window
STALLED_CANDIDATE
↓ evidence confirmed
REPATHING
↓ still stalled
RECOVERY_MOVE
↓ still stalled
TELEPORT_FALLBACK
↓ repeated failure
TERMINAL_STUCK
```

Each escalation is bounded.

## World mutation invalidation

After:

- structure load
- fill/setblock
- bridge repair
- gate/door change
- barricade spawn
- arena reset

previous path assumptions become stale.

Revalidate route corridors and path-critical markers before enabling waves.

## Analyzer diagnostics

- AI_MOVEMENT_COMPONENT_MISSING
- AI_NAVIGATION_COMPONENT_MISSING
- AI_TARGET_MISSING
- AI_TARGET_FILTER_MISMATCH
- AI_GOAL_STARVATION
- AI_CONTROL_FLAG_CONFLICT
- AI_NAVIGATION_ENVIRONMENT_MISMATCH
- AI_ROUTE_CORRIDOR_BLOCKED
- AI_ROUTE_SUPPORT_MISSING
- AI_STRUCTURE_MUTATION_INVALIDATED_ROUTE
- AI_DYNAMIC_CONGESTION
- AI_STALLED_CANDIDATE
- AI_RECOVERY_RETRY_UNBOUNDED
- AI_STALE_RECOVERY_CALLBACK
- AI_TELEPORT_FALLBACK_TOO_EARLY
- AI_FORMAT_VERSION_BEHAVIOR_REGRESSION

## Review questions

1. Does the entity currently have a valid target?
2. Which goal owns move/look/jump?
3. Are movement and navigation components both present?
4. Does navigation support the actual route environment?
5. Did world mutation change the route?
6. Does the route satisfy corridor geometry?
7. Is this static blockage or mob congestion?
8. Has the entity made meaningful progress recently?
9. Is recovery generation-scoped and bounded?
10. Could a newer format version reject the behavior JSON?
