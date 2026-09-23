# Camera, Cutscene, Player Control, and Cinematic Lifecycle Integrity

## Core problem

A cutscene is not one global timer.

```text
player camera
input permissions
FOV
HUD
gamemode
teleport
fade/easing
timeline callbacks
arena phase
```

All are separate resources that must converge.

## Per-player cinematic transaction

```text
PREPARE
↓
LOCK_CONTROL
↓
CAMERA_APPLY
↓
PLAYING
↓
RESTORE_CAMERA
↓
RESTORE_CONTROL
↓
VERIFIED_COMPLETE
```

Abort/skip/disconnect/reset branch out from any active phase.

## Why global cutscene queues are dangerous

Independent arenas can have independent player camera state. A single global cutscene queue can make Arena B appear unable to start while Arena A is simply consuming the shared queue.

Use per-player/per-arena ownership unless there is a truly global cinematic resource.

## Ownership envelope

Recommended fields:

```text
playerKey
connectionGeneration
arenaId
arenaGeneration
cinematicGeneration
sceneId
stepIndex
```

Every delayed fade/camera/teleport step revalidates this envelope.

## Skip semantics

Skip must:

- invalidate old scene steps
- restore owned camera/FOV/target state
- restore control/HUD/gamemode leases
- apply intended final teleport/postconditions if needed
- transition arena/player phase exactly once

## Disconnect and reconnect

Disconnect invalidates cinematic ownership. Reconnect creates a fresh session; do not resume old camera callbacks blindly.

## Fade + teleport

A fade can visually hide loading, but fade timing is not destination-readiness proof.

```text
fade
↓
destination readiness
↓
teleport
↓
post-teleport verification
↓
camera/control restore
```

## Analyzer diagnostics

- CINEMATIC_GLOBAL_QUEUE_BLOCKS_INDEPENDENT_ARENA
- CINEMATIC_PLAYER_OWNERSHIP_MISSING
- CINEMATIC_STALE_TIMELINE_STEP
- CINEMATIC_SKIP_NOT_TRANSACTIONAL
- CINEMATIC_DISCONNECT_CALLBACK_STALE
- CINEMATIC_ARENA_RESET_NOT_ABORTING_SCENE
- CINEMATIC_CAMERA_RESTORE_MISSING
- CINEMATIC_INPUT_RESTORE_MISSING
- CINEMATIC_HUD_RESTORE_MISSING
- CINEMATIC_GAMEMODE_RESTORE_MISSING
- CINEMATIC_BROAD_SELECTOR_CROSS_ARENA
- CINEMATIC_FADE_TREATED_AS_LOAD_PROOF
- CINEMATIC_FINAL_LOCATION_UNVERIFIED
- CINEMATIC_PARTIAL_COMPLETION_COMMITS_GAMEPLAY
- CINEMATIC_MULTIPLE_ACTIVE_SCENES_SAME_PLAYER

## Review questions

1. Is this camera resource per-player or accidentally global?
2. Can two arenas run cutscenes simultaneously?
3. What generation owns each timeline step?
4. Can skip leave camera/input state behind?
5. What happens on disconnect during fade/easing?
6. Does arena reset abort all scene steps?
7. Are camera, FOV, input, HUD, and gamemode all restored?
8. Are broad selectors affecting unrelated players?
9. Is teleport destination actually ready?
10. What proves the player is fully restored before gameplay begins?