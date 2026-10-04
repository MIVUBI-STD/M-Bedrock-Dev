# Real Map Audit — Manhunt v1.0.0

Status: real-map source audit complete for this pass  
Authority: selected current Drive artifact only  
Historical regression ingestion: none  
Runtime execution: not performed

## Target

- Drive folder: `PvP - Manhunt`
- Drive file: `Manhunt v1.0.0.mcworld`
- Drive file ID: `1gaHKkT-VrYVNehLLT_xiTHtpgNJ7BxQe`
- Artifact SHA-256: `c666000de5cd052288b00953baf9dc00410a65c6da53c16fb1e31b8e396025f3`
- BP/RP manifest version: `1.0.0`
- Internal level name: `Manhunt v1.0.0`

## Proven findings

No source-proven gameplay defect was admitted in this pass.

## Checks completed

- six-arena party isolation and started-party ownership;
- hunter/survivor role assignment;
- survivor health/elimination and hunter conversion accounting;
- round timeout state;
- player death/spawn/leave hooks;
- reconnect/party recovery ownership;
- world/ticking setup and arena start gates.

Current source explicitly tracks each round participant with role, health, online/eliminated state and arena ownership. Disconnect is handled by both the party layer and Manhunt gameplay layer; no stale-role progression contradiction was established.

## Result

Manhunt v1.0.0: **1 selected-artifact Major DESIGN_MISMATCH** after native replica proof.

No historical regression entry should be created without later current-artifact/runtime proof.


## Proven design mismatch — Arena 6 replica completeness

### DESIGN_MISMATCH — Arena 6 is materially incomplete relative to the authored arena replica

Severity: Major  
Proof: selected-artifact source + native LevelDB voxel proof  
Domain: arena-multi-arena / world-structure / replica completeness

#### Issue

The selected artifact authors six Manhunt arenas from one translated base layout. Arena 6 is configured exactly like the other playable arenas, but its native world geometry is not an equivalent replica.

#### Expected

Arena 6 should contain the same gameplay/world structure as the canonical arena after applying the authored +1255 block Z translation, aside from small intentional/runtime residue.

#### Actual package evidence

A normalized voxel comparison was run against the current Drive artifact using the authored arena translation:

- Arena 2 mismatch rate: approximately **0.12%** in the broad replicated envelope;
- Arena 3: approximately **0.06%**;
- Arena 4: approximately **0.00%**;
- Arena 5: approximately **0.12%**;
- Arena 6: approximately **5.62%** (**6,207 sampled voxel mismatches**).

Arena 6 mismatches are spatially concentrated rather than random. The dominant differences are canonical structure blocks becoming air:

- 2,655 sampled `minecraft:stone` blocks → air;
- 945 `minecraft:gray_wool` → air;
- 552 `minecraft:tuff` → air;
- 473 `minecraft:gray_concrete` → air;
- 432 `minecraft:cyan_terracotta` → air;
- 357 `minecraft:gray_concrete_powder` → air.

The missing region overlaps the authored arena/cinematic envelope. For example, the current source translates a Manhunt cinematic scene at `(-985, 18, -321)` into Arena 6, while the native replica divergence extends through that far-side region.

The lower-level LevelDB density check independently shows the same outlier: Arena 6 has roughly half the proportion of complex gameplay-height subchunks seen in Arenas 1–5.

#### Reproduction path

1. Start or inspect Manhunt Arena 1 and Arena 6.
2. Compare the corresponding far-side arena area using the authored +1255 Z translation.
3. Move/view through the region corresponding to the canonical structure around Z -340 through -220.
4. Confirm substantial terrain/build geometry present in the canonical arena is air/missing in Arena 6.

#### Player-visible consequence

Arena 6 presents as a normal playable 16-player arena but delivers incomplete physical world content. Players can enter a materially different/truncated arena instead of the authored replica.

#### Root cause

The script/config replica contract was copied to Arena 6, but the world voxel content was not completely replicated.

#### Repair direction

Restore Arena 6 from the canonical arena using the exact authored translation, then run full voxel/block-entity replica proof before release. Preserve Arena 6's own join/session identity while replacing only divergent world content.
