# Runtime Observation Contract

Runtime harnesses must emit one shared evidence format instead of embedding validation semantics into GameTest, scripts, screenshots or manual tooling.

## Snapshot

```text
RuntimeObservationSnapshot
├── minecraftVersion
├── artifactFingerprint
├── tick
├── players[]
├── arenas[]
├── entities[]
├── chunks[]
└── metadata
```

Player observations can carry:

- connection state;
- arena assignment;
- lifecycle phase;
- progress;
- tags;
- scores;
- position.

Arena observations can carry:

- active player IDs;
- cutscene state;
- round;
- tags;
- scores.

Entities and chunks are included as evidence surfaces even though the initial session-model comparator does not yet interpret all of them.

## Unknown evidence

Missing runtime fields are not silently treated as proof.

Normalization records explicit unknowns such as:

```text
player:p1:progress-unknown
arena:arena1:membership-unknown
arena:arena1:cutscene-unknown
```

Fallback values only allow deterministic comparison infrastructure to continue; unknown markers preserve the confidence boundary.

## Comparison

```text
Expected Session Model
        +
Runtime Observation
        ↓
Normalization
        ↓
Invariant Check
+
Model Divergence
        ↓
RuntimeComparisonResult
```

A runtime snapshot may fail because:

- an expected player/arena is missing;
- unexpected state appears;
- lifecycle values differ from the model;
- the actual observed state itself violates an invariant.

## Harness boundary

GameTest, Script API instrumentation, manual capture, multiplayer automation and version-differential runners should all emit this contract.

They should not each implement their own meaning of session correctness.
