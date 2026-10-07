---
id: document.analysis.client-feedback-runtime
class: DOCUMENT
domain: analysis
role: DOMAIN
authority: CANONICAL
lifecycle: ACTIVE
---

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

## Transition and terminal feedback

Player-facing transition text is a projection of the already-decided gameplay transition.

Preferred order:

```text
current state completes
→ determine actual next state
→ publish matching transition feedback
→ execute transition
```

Do not publish a generic forward transition such as `Next Round`, `Next Wave`, or `Continue` before proving that the corresponding state exists. If terminal eligibility is decided later, feedback can become false while gameplay state remains technically correct.

Terminal result feedback is also separate from result authority:

```text
terminal condition
→ settle authoritative result exactly once
→ present the settled result
→ cleanup / return
```

Review title, subtitle, actionbar, chat, form, scoreboard, sound, and cinematic surfaces as distinct presentation channels. A correct chat result does not prove that an authored final-result form/title/sound is reachable, and a presentation surface must not recalculate the authoritative winner/result.

When the selected artifact contains a dedicated terminal presentation surface that has no reachable production caller, compare that authored capability with the actual terminal flow as a DESIGN_MISMATCH candidate.

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
- FEEDBACK_TRANSITION_PUBLISHED_BEFORE_NEXT_STATE
- FEEDBACK_TERMINAL_RESULT_PRESENTATION_DISCONNECTED

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
## Platform knowledge

Minecraft platform facts referenced by this analysis are owned by:

- [Client Feedback](../../engine/knowledge/player-runtime/client-feedback-bedrock.json)

This document owns audit/failure-model guidance. The linked knowledge files own platform facts and applicability.