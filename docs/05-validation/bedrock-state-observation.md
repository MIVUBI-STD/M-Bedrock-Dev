# Bedrock Scoreboard/Tag Observation Adapter

The runtime observation layer now has a declarative adapter for Bedrock scoreboard/tag state.

## Purpose

Many gameplay systems encode session state through tags and objectives rather than through one explicit runtime API.

The adapter converts raw observations such as:

```text
player tags:
- arena:arena1
- session:playing

scores:
session_progress = 3
```

into:

```text
PlayerObservation
arenaId = arena1
phase = playing
progress = 3
```

## Mapping is explicit

The engine does not guess naming conventions.

A `BedrockObservationMapping` declares:

- arena tag prefix;
- phase tags;
- optional phase score mappings;
- progress objective;
- arena cutscene objective;
- arena round objective;
- whether membership is derived from player arena mapping.

The provided default mapping is only a reusable convention. Project-specific maps should supply their own mapping when names differ.

## Ambiguity

Conflicting evidence is never silently resolved.

Examples:

```text
arena:arena1
arena:arena2
```

or:

```text
session:starting
session:playing
```

produce a mapping issue and leave the semantic field unset.

That missing field later becomes explicit unknown evidence during normalization.

## Boundary

The adapter consumes already-captured raw scoreboard/tag state.

It does not execute Minecraft commands and does not own GameTest/Script API capture.
