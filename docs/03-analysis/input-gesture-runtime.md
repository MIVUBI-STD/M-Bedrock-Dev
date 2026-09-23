# Input, Cooldown, Item Use, and Hold-Release Gesture Integrity

## Core problem

Input is often a lifecycle, not one event.

```text
IDLE
↓
PRESSED / STARTED
↓
HELD / CHARGING
↓
RELEASED / COMPLETED
or
CANCELLED
```

Start, use, stop, and release events are not interchangeable.

## Gesture ownership

Track:

```text
playerKey
connectionGeneration
arenaGeneration
life/participationGeneration
gestureGeneration
item identity/signature
purpose
```

A stop/release event only completes the current matching gesture.

## Teleport stop-use hazard

itemStopUse may occur because the player changed dimension and the itemStack can be undefined. Treat unmatched stop-use as cancellation/no-op, not successful completion.

## Hold vs press

Do not treat Sneak/Use/Interact state as a single press by default. Use edge detection, first-event semantics, debounce, or explicit gesture state.

This is directly relevant to revive systems: a downed player's own sustained sneak state must never be interpreted as an external reviver action.

## Cooldown

Cooldown can be category-scoped. Two different items can intentionally or accidentally share one cooldown category.

Gameplay eligibility should check the actual cooldown contract, not only a visual cooldown animation or local timer.

## Before event

Use before-events to cancel/deny actions; keep transaction mutations in allowed execution phases.

## Reset integration

Disconnect, respawn, item replacement, arena reset, and session-generation changes invalidate active gestures before new gameplay starts.

## Cross-device semantics

Build logic around semantic events rather than hardcoding assumptions about Shift, mouse buttons, controller buttons, or touch UI timing.

## Analyzer diagnostics

- INPUT_GESTURE_STATE_MACHINE_MISSING
- INPUT_GESTURE_OWNER_MISSING
- INPUT_HOLD_TREATED_AS_SINGLE_PRESS
- INPUT_START_USE_TREATED_AS_COMPLETION
- INPUT_RELEASE_WITHOUT_MATCHING_START
- INPUT_STOP_USE_TELEPORT_FALSE_COMPLETION
- INPUT_STALE_RELEASE_AFTER_RESET
- INPUT_COOLDOWN_UI_USED_AS_AUTHORITY
- INPUT_COOLDOWN_CATEGORY_CONFLICT
- INPUT_BEFORE_EVENT_ILLEGAL_MUTATION
- INPUT_DUPLICATE_GESTURE_SIDE_EFFECT
- INPUT_ITEM_IDENTITY_CHANGED_MID_GESTURE
- INPUT_KEYBOARD_SPECIFIC_ASSUMPTION
- INPUT_PRESENTATION_USED_AS_COMPLETION_PROOF

## Review questions

1. Is this action press, hold, release, or completion?
2. What gesture generation owns it?
3. Does release match a valid start?
4. Can teleport/dimension change produce a stop event?
5. Can the held state repeat actions?
6. Is cooldown actual or only visual?
7. Do other items share the cooldown category?
8. Can reset/disconnect leave an active gesture?
9. Does item identity remain the same throughout the gesture?
10. Is the logic semantic across keyboard/controller/touch?