# Behavioral World Model

The Behavioral World Model is the executable specification boundary between structural understanding and runtime experimentation.

## Separation of authorities

```text
Semantic IR
  describes what source structure can execute/read/write/schedule

Knowledge
  describes evidence-backed Minecraft claims and applicability

Behavioral World Model
  defines explicit state, transition, and temporal semantics

Reliability Search
  explores model states/actions/schedules

Runtime Lab
  tests selected claims against Minecraft
```

No layer may silently promote its own representation into another authority.

## State

A model declares typed semantic variables with an authority:

```text
engine
script
command
derived
unknown
```

A variable is not considered authoritative merely because a script can read or write a similarly named scoreboard/tag/property.

Domain adapters must explicitly map concrete Minecraft observations or source surfaces into model variables.

## Transitions

A transition contains:

```text
owner
preconditions
effects
nondeterminism surfaces
```

v1 effects are deterministic after a transition is selected. Nondeterminism is represented explicitly as a surface rather than hidden inside transition execution.

This permits later exploration engines to decide which ordering or engine choice must be searched.

## Nondeterminism surfaces

The v1 taxonomy includes:

- tick scheduling;
- event ordering;
- deferred callback ordering;
- entity tick ordering;
- chunk residency;
- AI goal arbitration;
- pathfinding;
- network/input ordering;
- death/respawn ordering;
- command ordering;
- scoreboard visibility;
- script-event delivery;
- structure-load ordering;
- dimension transitions;
- world persistence;
- unknown.

The taxonomy describes uncertainty/control surfaces. It does not claim these surfaces are controllable or replayable on every Minecraft host.

Future host/edition overlays must classify each surface independently as observable, controllable, replayable, simulatable, or unknown.

## Temporal properties

v1 supports finite-trace evaluation of:

```text
ALWAYS P
EVENTUALLY P [within N ticks]
P LEADS-TO Q [within N ticks]
P UNTIL Q [within N ticks]
```

Three-valued results are mandatory:

```text
satisfied
violated
unknown
```

### Conservative finite-trace rule

An incomplete trace is a prefix, not a proof of future behavior.

Therefore:

- an observed ALWAYS counterexample can prove violation;
- a clean incomplete ALWAYS prefix remains unknown;
- an EVENTUALLY witness can prove satisfaction;
- missing EVENTUALLY evidence remains unknown until a deadline expires or the trace is declared complete;
- LEADS-TO remains unknown while a triggered obligation can still be discharged;
- bounded deadlines can prove violations before trace completion.

This prevents passive observation from being promoted into false liveness or safety certainty.

## Current limitations

v1 intentionally does not provide:

- symbolic execution;
- SMT solving;
- fairness assumptions;
- Büchi/cycle liveness checking;
- state symmetry reduction;
- probabilistic belief;
- causal inference;
- automatic Semantic-IR-to-model synthesis;
- complete Bedrock or Education semantics.

Those are later layers built on top of the kernel, not shortcuts hidden inside it.
