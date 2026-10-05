# Sound, Music, Animation, and Visual Feedback Lifecycle Integrity

## Core problem

Client-facing feedback can be wrong while gameplay state is correct.

```text
arena state correct
↓
feedback missing / stale / overwritten
↓
player perceives wrong state
```

Feedback is therefore a mirror that needs ownership, reconciliation, and lifecycle cleanup.

## Presentation surfaces

- animation controllers
- raw animations
- Molang-driven visuals
- sounds and music
- titles and subtitles
- actionbars
- particles
- world-based status blocks/entities
- objective markers
- cinematic cues

## Mirror rule

```text
authoritative gameplay state
↓
renderer / feedback projection
↓
client presentation
```

Never invert this flow by treating presentation as the authority.

## Lobby status example

```text
EMPTY      -> white
CONNECTING -> orange
OCCUPIED   -> red
```

Colors should be rendered from authoritative arena state. If structure reset restores the indicator to a default color, the renderer must immediately project the current state again.

## Animation controller integrity

Animation controllers are client-side state machines. Their transition conditions should be based on authoritative or deliberately mirrored properties rather than inventing an independent gameplay state machine.

Client load starts from the controller initial state, so long-lived visual state must be reconstructable from current conditions.

## Feedback ownership

Recommended envelope:

```text
playerKey or arenaId
connectionGeneration
arenaGeneration
feedbackGeneration
purpose
priority
```

Old callbacks must not overwrite newer feedback.

## Title/actionbar arbitration

Multiple writers can overwrite each other. Define purpose/priority arbitration for critical messages such as countdown, revive, warning, objective, and admin feedback.

## Loop lifecycle

Long-lived feedback must have explicit START and STOP/RESET ownership.

Examples:

```text
music loop
ambient sound
looping animation
persistent particle emitter
status marker
```

## Late join / reload

Do not depend only on historical events like 'arena became occupied' to paint the UI. A client joining later must be able to reconstruct the current visual state from authority.

## Analyzer diagnostics

- FEEDBACK_PRESENTATION_USED_AS_AUTHORITY
- FEEDBACK_OWNER_MISSING
- FEEDBACK_STALE_GENERATION_UPDATE
- FEEDBACK_CROSS_ARENA_AUDIENCE
- FEEDBACK_TITLE_CHANNEL_OVERWRITE
- FEEDBACK_LOOP_STOP_MISSING
- FEEDBACK_ANIMATION_DUAL_STATE_MACHINE
- FEEDBACK_ANIMATION_CONDITION_AUTHORITY_MISMATCH
- FEEDBACK_CLIENT_RELOAD_RECONSTRUCTION_MISSING
- FEEDBACK_PARTICLE_WRONG_EXECUTION_ORIGIN
- FEEDBACK_WORLD_INDICATOR_NOT_RERENDERED_AFTER_RESET
- FEEDBACK_LOBBY_STATUS_MISSING
- FEEDBACK_LOBBY_STATUS_WRONG_COLOR
- FEEDBACK_VISUAL_POSTCONDITION_UNVERIFIED
- FEEDBACK_ANIMATION_VERSION_REGRESSION

## Review questions

1. What authoritative state produces this feedback?
2. Who owns the feedback generation?
3. Can another system overwrite it?
4. Is the audience correctly scoped?
5. Does looping feedback have a stop/reset path?
6. Can late joiners reconstruct the current visual state?
7. Does structure/reset overwrite a world-based indicator?
8. Are animation-controller conditions aligned with gameplay authority?
9. Is command context correct for particle placement?
10. Is this regression potentially version-sensitive?