# Real Map Audit — Five Nights at Z Village Level 2 v1.2.2

Status: real-map source audit complete for this pass  
Authority: selected current Drive artifact only  
Historical regression ingestion: none  
Runtime execution: not performed

## Target

- Drive project: `PvP - Five Nights at Z Village / Level 2`
- Drive filename: `Defense_Level_2_v1_2_0.mcworld`
- Drive file ID: `1v-7t1gvcPoIxZuaexUnWKxUqtv-ezB8S`
- Artifact SHA-256: `d515dcf21bc1665f41c0ae8d3b316721d1ef9ee4ba4ed0212ad7f0d36017d96b`
- Behavior Pack manifest version: `1.2.2`
- Resource Pack manifest version: `1.2.2`
- Internal level name: `Defense Level 2 v1.2.2`

The Drive filename is stale metadata. Current artifact gameplay authority is internally consistent at v1.2.2.

## Proven findings

No source-proven gameplay defect was admitted in this pass.

## Historical issue re-checks

### keepInventory

Current world setup explicitly applies `keepInventory = true`. The historical disabled-keepInventory issue is not present in this source.

### Builds Shop

Current shop configuration contains real build-item offers, including Barricade and Spike Trap. The historical empty Builds Shop issue is not present.

### Purchase atomicity

Current purchase paths contain failure handling/refund behavior for potion command delivery and enchant persistence. Historical coin-loss behavior was not re-proven from this artifact.

### Flag loss reachability

Current flag configuration uses `damagePerZombie = 4`, with an explicit current-source note that undefended flags should be able to fall under sustained pressure. The earlier 1-damage unreachable-loss condition is not carried forward as a current issue.

## Arena loading / ticking proof

The current source builds required gameplay chunks from:

- authored path nodes and path edges;
- Cave/Windmill/Bridge/Gate spawn positions and sub-spawners;
- random spawn positions;
- Gatekeeper/start barricades;
- shop chests;
- cinematic camera positions;
- boss summon positions.

Chunks within Chebyshev radius 4 of the arena spawn are treated as reliable gameplay range. Required chunks outside that range are converted into retained ticking rectangles.

For arena 1, current source coordinates produce only three outside path/coverage chunks:

```text
(-3,5)
(2,3)
(3,3)
```

Their bounding rectangle is:

```text
x: -3..3  = 7 chunks
z:  3..5  = 3 chunks
area       = 21 chunks
```

Because 21 <= the 100-chunk per-area limit, `createKeepAliveAreas()` produces exactly **one** retained area.

Therefore the guard:

```text
if (keepAliveAreas.length > 1)
→ abort loading
```

does **not** deterministically block current v1.2.2 startup.

This candidate was rejected rather than reported.

## Reset / ownership

`ArenaLoadingCoordinator` binds retained ticking areas to both `sessionId` and `generation`. Cleanup/release verifies the same ownership before removing retained areas.

This is materially safer than the stale arena-ID-only lease behavior proven in Defense Challenge v1.1.1.

## Result

Five Nights at Z Village Level 2 current artifact v1.2.2: **0 source-proven gameplay findings** in this pass.

No historical regression entry should be created without later current-artifact/runtime proof.
