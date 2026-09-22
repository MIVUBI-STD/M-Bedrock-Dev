# Bedrock Runtime Evidence Emitter

The runtime emitter is a thin capture boundary for Minecraft Bedrock Script API / GameTest environments.

## Verified stable API surface

The emitter is designed around current stable Creator APIs:

- `world.getAllPlayers()` for active players;
- `Entity.getTags()` for tags;
- `world.scoreboard.getObjective(id)` and `ScoreboardObjective.getScore(...)` for scores;
- `system.currentTick` for server tick;
- `Dimension.getEntities(...)` for selected entity evidence.

The repository uses structural TypeScript interfaces instead of importing `@minecraft/server` directly. A runtime pack can pass the real `world` and `system` objects into the emitter without making the core engine depend on Minecraft runtime packages.

## Capture pipeline

```text
@minecraft/server world + system
        ↓
captureBedrockRuntimeState()
        ↓
raw tags / scoreboard / entity evidence
        ↓
adaptBedrockState()
        ↓
RuntimeObservationSnapshot
        ↓
runtime/model comparison
```

## Configuration

Capture is intentionally bounded.

The emitter must be told:

- player scoreboard objectives to read;
- arena scoreboard objectives to read;
- arena score participants/fake-player names;
- optional entity queries;
- optional arena tag prefix for captured entities;
- externally known Minecraft version/artifact fingerprint.

Minecraft version is not guessed from runtime state.

## Failure handling

Missing objectives, score read failures, tag failures and entity-query failures become `RuntimeCaptureIssue` entries.

The emitter does not convert those failures into default semantic values.

## Correctness boundary

The emitter only captures evidence.

It does **not** decide:

- whether a player belongs to the correct arena;
- whether a cutscene should be active;
- whether progress is valid;
- whether entities behaved correctly.

Those rules remain in the reliability model/invariant layer.
