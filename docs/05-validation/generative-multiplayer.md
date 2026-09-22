# Generative Multiplayer State Testing

Phase B begins with a pure deterministic multiplayer/session model before any live Minecraft automation.

## Why model first

Runtime chaos without an expected model produces noise.

The model defines the intended lifecycle:

```text
lobby
→ assigned
→ starting
→ playing
→ completed
→ reset/reassign
```

Disconnect/reconnect is modeled explicitly:

```text
disconnect
→ connection false
→ active progress cleared
→ arena assignment retained when policy permits
→ reconnect returns to assigned, not playing
```

## Generated actions

Current property generator can combine:

- join;
- assign;
- start;
- begin playing;
- progress;
- complete;
- disconnect;
- reconnect;
- reset arena.

fast-check generates and shrinks action sequences so a discovered violation can be reduced toward a minimal reproduction. citeturn447788search1turn447788search2

## Current invariants

- player belongs to at most one arena;
- player arena assignment matches arena membership;
- disconnected player has zero active progress;
- playing requires connected assigned session;
- cutscene state belongs to an actual starting arena session;
- independent arenas may have cutscenes active concurrently.

## Boundary

This is not Minecraft runtime proof.

The pure model answers:

> What should always remain true?

A later runtime adapter will translate observed Minecraft state into the same model and reuse the exact invariant checker.

That separation lets runtime failures become reproducible model violations instead of ad-hoc screenshots.
