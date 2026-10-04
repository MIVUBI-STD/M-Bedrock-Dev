# Real Map Audit — The Circuit v1.0.2

Status: selected-artifact source audit evidence  
Authority: selected current Drive artifact only  
Historical regression ingestion: not applicable; no current finding approved  
Runtime execution: not performed

## Target

- Drive folder: `Challenge - The Circuit`
- Drive file: `The Circuit v1.0.2.mcworld`
- Drive file ID: `1oH2nPJJzgg5SRgORMYV_wzMkiSK9GRGS`
- Artifact SHA-256: `19e2eb038b0b01fe756715c725df7e39d74e8cf2de8c45705d1897ea3ffb6151`
- File version label: `1.0.2`
- Behavior/Resource Pack manifest version: `1.0.1` (metadata/version mismatch only; not admitted as gameplay bug)
- min engine version: `1.21.130`

## Current source-proven findings

None admitted in this bounded source pass.

## High-risk areas checked

### Capture Run historical gate blocker

Historical regression `reg_capture_run_gate_blocked` was used only as search pressure.

Current v1.0.2 source explicitly calls `FortifyBuildService.ensureGateOpen(arenaId)` before Capture Run preparation and documents that Fortify restores the shared gate to spruce wood while Capture Run requires the route open.

The historical gate-block root cause is therefore not reproduced by current source.

### Arena count

Current selected artifact authors five Circuit arenas:

```text
createArena(1)
createArena(2)
createArena(3)
createArena(4)
createArena(5)
```

Selected source/world string search found no `arena_6` authoring. Older six-arena layouts are not current-artifact authority, so no mismatch is admitted.

### Pathway / ticking-area ownership

Circuit dynamically derives gameplay-specific pathway ticking bounds, creates a named `circuit_path_<arena>` ticking area, removes stale area with the same name before create, and removes it on arena deactivation.

Current source therefore does not reproduce the missing-arena-ticking-area defect seen in Composite.

### Independent player starts

Current `SessionStartService` intentionally allocates a free arena independently per ready player. It has no all-ready barrier and current source explicitly documents this as the intended flow.

### Capture Run reset/build flow

Capture Run loads the tier structure, clears all authored build features, reapplies only active tier features, ensures flags/defenders, and waits until preparation is valid before entering RUN.

No source-proven current blocker was established in this pass.

## Audit obligation / runtime checks

These remain runtime-sensitive rather than current bugs:

- verify Capture Run flag/entity behavior when far from the player's current loaded chunks;
- exercise reconnect during every gameplay-specific round because each round owns detailed restore state separately;
- validate pathway marker spawn/retry under Education Edition chunk timing.

They are not admitted as bugs without current causal proof.

## Result

The Circuit v1.0.2 is recorded as **0 current source-proven gameplay findings** in this pass.

The metadata mismatch between the file label (v1.0.2) and BP/RP manifest version (v1.0.1) should be cleaned separately if package-version identity is important, but it is not treated as a gameplay defect.


## Client-reported issue re-check — current artifact

The client note contains a mix of still-current and stale claims.

### Still current

- `Circuit Party` has `max_member: 5`.
- Five arena configs exist, so the current design assigns at most one simultaneous player lane per party member.
- Drive/pack/internal version labels remain inconsistent (Drive 1.0.2, pack 1.0.1, internal world naming 1.0.0).
- `DebugStickService` is initialized in the production bootstrap and reacts to any held `minecraft:stick` without an internal permission check. Normal-player stick reachability still requires gameplay/world evidence before report promotion.

### Not reproduced

The claim that Circuit creates no gameplay ticking areas is stale for the selected artifact.

Current flow:

```text
SessionStartService
→ PathwayLoader.ensureArena(...)
→ _activateTickingArea(...)
→ tickingarea add <gameplay pathway bounds> <arena-specific name> true
→ pathway marker initialization
```

The ticking area is removed again when the arena/gameplay is deactivated. Therefore the empty static `arena.tickingAreas` array is not missing-residency proof in this version.

The five-player classroom-capacity concern is real as an implementation/product-capacity fact, but it is not automatically a gameplay BUG without adopting a higher required class capacity as the current requirement.


## Deep multi-arena pass — assignment and world-mutation counter-proof

The five independent Circuit arenas were rechecked for world-global maintenance and cleanup leakage.

Current source:

- gameplay assignment is stored per player and resolves one active arena/gameplay owner;
- auto-repair and nearby-dirt maintenance iterate scheduler players but immediately skip anyone without a current arena assignment;
- pathway ticking areas use an arena-specific resource name and are activated/deactivated through the assigned gameplay path;
- global player enumeration in ExitVote cleanup is used only when the overall Circuit session is no longer active, to remove stale session exit items;
- developer skip commands require the current developer permission owner before resolving the player's assigned arena/gameplay.

No additional cross-arena state/mutation defect was established in these paths.

The existing five-player party/classroom-capacity fact and unguarded DebugStick trigger remain separate capability/reachability questions; they are not promoted without a selected-artifact requirement/reachability proof.
