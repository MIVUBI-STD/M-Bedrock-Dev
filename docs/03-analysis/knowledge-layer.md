# Bedrock / Education Knowledge Layer

The analyzer stack now has a dedicated machine-readable knowledge authority.

## Problem

Pattern detection alone cannot distinguish:

- a suspicious pattern;
- a valid Bedrock mechanic;
- a version/profile-specific behavior;
- an Education-specific execution context;
- a real engine regression.

## Ownership

`packages/knowledge` owns knowledge contracts, validation and effective-profile selection.

`knowledge/*.json` owns curated facts and provenance.

Analyzers remain responsible for parsing project content. They should consume knowledge rather than duplicate Minecraft semantics internally.

## Initial scope

Phase 1 seeds:

- command coordinate/execution context;
- target selector semantics;
- scoreboard state semantics;
- execute conditional state;
- teleport selector constraints;
- entity component-group/event lifecycle;
- summon/spawn-event distinction;
- AI priority;
- navigation/movement dependencies;
- NPC initiator context.

## Effective profile

Knowledge can be filtered by:

- Bedrock vs Education;
- Minecraft version;
- format version;
- experiments;
- Script API module/version.

## Evidence rule

Every durable fact requires source provenance and authority/confidence metadata.

UNKNOWN is preferable to invented behavior.
