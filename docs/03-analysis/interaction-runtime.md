# UI, Input Permissions, and Interaction Lifecycle

## Core problem

Player interaction is asynchronous and stateful.

These are not equivalent:

```text
form opened
player still connected
player still in same arena
button still legal
response arrived
side effect still valid
```

## Form lifecycle

```text
CREATE
↓
SHOW
↓
PENDING
├─ CANCELLED
├─ REPLACED
├─ DISCONNECTED
└─ RESPONSE
     ↓
REVALIDATE
     ↓
COMMIT / REJECT
```

Every form response is a deferred callback.

## Form ownership envelope

```ts
interface FormOwnership {
  playerKey: string;
  connectionGeneration: number;
  arenaId?: string;
  arenaGeneration?: number;
  interactionGeneration: number;
  formGeneration: number;
  purpose: string;
}
```

The response can mutate gameplay only when this envelope is still current.

## Stale UI example

```text
player opens Start Arena
↓
arena resets
↓
new arenaGeneration
↓
old form still visible
↓
player presses Start
```

Without generation validation, the old UI mutates the new arena.

## Input permission leases

Do not model input locking as a simple disable then enable pair.

Use ownership:

```text
movement locks:
- cutscene#42
- revive#17
- setup#9
```

When cutscene#42 ends, movement remains disabled if another valid owner still holds the category.

## Restore boundaries

Reconcile input permissions on disconnect, reconnect, respawn, arena reset, cutscene abort, setup abort, spectator exit, world recovery, and session/arena generation change.

## Held interaction hazard

Block interaction can emit repeated events while the button remains held. For one-action semantics, require isFirstEvent where available or explicit debounce/idempotency.

This matters for revive, ready pads, purchases, upgrades, objective activation, claims, and control panels.

## Actor-target proof

An interaction event proves that a player interacted with a target. It does not prove same arena, same generation, current target ownership, or current action legality.

## Analyzer diagnostics

- UI_FORM_RESPONSE_STALE_SESSION
- UI_FORM_RESPONSE_STALE_ARENA
- UI_FORM_DUPLICATE_ACTIVE
- UI_FORM_CANCEL_FALLTHROUGH
- UI_FORM_DEFAULT_ACTION_ON_UNDEFINED
- UI_FORM_STATE_NOT_REVALIDATED
- UI_STALE_PRESENTATION_USED_AS_AUTHORITY
- INPUT_LOCK_OWNER_MISSING
- INPUT_LOCK_PREMATURE_RESTORE
- INPUT_LOCK_LEAK_AFTER_RESPAWN
- INPUT_LOCK_LEAK_AFTER_ABORT
- INPUT_PERMISSION_RESTORE_UNVERIFIED
- INTERACTION_HELD_INPUT_DUPLICATE
- INTERACTION_FIRST_EVENT_IGNORED
- INTERACTION_CROSS_ARENA_TARGET
- INTERACTION_TARGET_STALE
- INTERACTION_DUPLICATE_SIDE_EFFECT

## Review questions

1. What generation owns this form?
2. Can the player disconnect before response?
3. Can arena/round state change while the form is open?
4. Does cancellation have an explicit path?
5. Can multiple forms of the same purpose overlap?
6. Who owns each disabled input category?
7. Can one subsystem unlock input owned by another?
8. Does respawn/reset restore input correctly?
9. Is a held interaction interpreted as repeated actions?
10. Are actor and target revalidated before commit?