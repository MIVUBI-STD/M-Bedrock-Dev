# Active Runtime Diagnosis

M-Bedrock-Dev must distinguish **valid theory** from **observed runtime truth**.

A repair is not justified merely because source syntax, commands, structures, or API usage look correct. Minecraft Bedrock and Minecraft Education expose runtime boundaries where the same source can behave differently because of execution phase, tick scheduling, chunk/simulation state, entity lifetime, multiplayer interleaving, device load, version line, or external Education state.

## Runtime truth ladder

Use the narrowest statement actually proven:

```text
source exists
→ syntax / schema valid
→ version / edition capability valid
→ execution privilege valid
→ callback/event reached
→ target dimension resolved
→ target chunk script-valid loaded
→ target region actively ticking when required
→ entity/block/state handle still valid
→ mutation completed
→ downstream consumer observed the mutation
→ gameplay invariant holds under the relevant multiplayer/session interleaving
```

Never collapse adjacent levels into one assumption.

Examples:

- a visible chunk is not proof that gameplay mechanics are simulated;
- a successful teleport request is not proof that every target chunk is ready;
- a fixed tick delay is not chunk-readiness evidence;
- an entity id recorded earlier is not proof that the entity is currently resolvable;
- a callback scheduled with `system.run` is not a wall-clock guarantee;
- a ticking area is not proof of every player-dependent behavior;
- static API compatibility is not runtime compatibility;
- Bedrock retail behavior is not automatically Education behavior.

## Diagnosis loop

```text
symptom
→ scope the incident
→ enumerate plausible first-wrong-owner candidates
→ mark what is observed vs inferred vs unknown
→ select the cheapest non-destructive probe that best separates candidates
→ capture result
→ reject/support candidates
→ repeat only while ambiguity remains
→ mutate only after sufficient causal evidence
→ verify the original gameplay invariant
```

The probe planner is deterministic. It does not invent probabilities. It ranks probes by how many unresolved candidate pairs they can distinguish, adjusted by evidence cost and mutation risk.

## Bedrock-specific probe families

Prefer direct runtime predicates when available:

- chunk readiness: `Dimension.isChunkLoaded`, ticking-area readiness, or explicit supported area-loaded evidence;
- execution phase: startup / early execution / restricted execution / default execution;
- scheduling: callback reached tick, queued tick, elapsed ticks, stale generation/callback checks;
- entity lifecycle: id resolution, dimension, last-known location, validity/liveness evidence;
- structure mutation: placement requested, placement completed, post-placement readiness, dependent action observed;
- simulation: distinguish render presence, loaded-for-script, ticking/simulation, and player-dependent spawning;
- multiplayer: arena/session generation, ownership, duplicated callbacks, stale async work, disconnect/reconnect transitions;
- Education: edition/version profile plus Agent, classroom/admin, dedicated-server, or student-code mutations that are outside normal pack ownership.

## Mutation policy

A broad reset, retry loop, permanent ticking area, forced teleport, extra delay, cache, or compatibility fallback is not a diagnosis.

Those actions may hide the symptom while preserving the first wrong owner. Use them only when the causal model identifies them as the intended fix or as a bounded recovery mechanism.

## Evidence ceiling

```text
REMOTE_GITHUB   → source/static hypotheses and probe design
LOCAL_ARTIFACT  → actual archive/world/database evidence
LOCAL_MINECRAFT → import/load and local runtime evidence
LIVE_MINECRAFT  → gameplay, timing, simulation, multiplayer and device/load behavior
```

When the required discriminating probe is above the available context, report that probe as blocked rather than replacing it with a weaker proxy.
