# Player Permissions, Gamemode, Abilities, and Developer Access Integrity

## Core problem

These are different state surfaces:

```text
player permission level
command permission level
gamemode
input permissions
developer capability
arena role
```

Do not collapse them into one concept like admin=true.

## Developer access

Developer/admin capability should be explicit and auditable.

Do not infer it from:

- Creative mode
- Operator status alone
- a gameplay tag
- scoreboard value
- lobby position
- arena membership

## Least privilege

Developer commands such as force start, skip level, reset arena, teleport, structure load, give kit, or kill entities should use the minimum command permission level and explicit scope.

## Gamemode lease

Temporary gamemode transitions should capture:

```text
playerKey
connectionGeneration
arenaGeneration
originalGamemode
temporaryGamemode
reason
leaseGeneration
restorePolicy
```

This is especially important for Spectator chunk loading and cutscene/dev workflows.

## Spectator rules

Spectator is excluded by default from active/ready/alive/interactable participant predicates. A spectator should not satisfy arena gameplay conditions unless the mode explicitly allows it.

## Separate restoration surfaces

```text
restore gamemode
!=
restore input permissions
!=
restore operator/command permission
!=
restore gameplay role
```

Each must be reconciled independently.

## Production debug registry

Track and audit:

- dev commands
- bypass tags
- hidden debug buttons
- admin-only items
- test command blocks
- debug scoreboards
- test teleports
- force-complete hooks

Release analysis should flag any test-only surface still enabled unintentionally.

## Reconnect

Reconnect creates a new session generation. Revalidate permission/gamemode/control state instead of blindly carrying transient dev or spectator state forward.

## Analyzer diagnostics

- PERMISSION_DEV_ACCESS_AUTHORITY_UNDECLARED
- PERMISSION_COMMAND_LEVEL_TOO_BROAD
- PERMISSION_DEV_COMMAND_GLOBAL_SELECTOR
- PERMISSION_OPERATOR_USED_AS_GAMEPLAY_AUTHORITY
- PERMISSION_CREATIVE_USED_AS_DEV_AUTHORITY
- PERMISSION_GAMEMODE_LEASE_MISSING
- PERMISSION_SPECTATOR_COUNTED_ACTIVE
- PERMISSION_SPECTATOR_INTERACTION_LEAK
- PERMISSION_RECONNECT_PRIVILEGE_LEAK
- PERMISSION_GAMEMODE_RESTORE_MISSING
- PERMISSION_COMMAND_ACCESS_RESTORE_MISSING
- PERMISSION_INPUT_AND_GAMEMODE_STATE_DIVERGED
- PERMISSION_DEBUG_SURFACE_LEFT_ENABLED
- PERMISSION_DEV_ACTION_NOT_AUDITED
- PERMISSION_PLAYER_NORMAL_FORM_UNVERIFIED

## Review questions

1. What exact capability authorizes this developer action?
2. Is the command permission level minimal?
3. Is the target scope explicit?
4. Is Operator being confused with gameplay role?
5. Is Creative being confused with developer identity?
6. Who owns temporary Spectator/Creative mode?
7. Can reconnect restore stale privilege?
8. Are gamemode and input permissions reconciled separately?
9. Are debug surfaces disabled or guarded for production?
10. Can every high-impact dev intervention be distinguished in diagnostics?