# Real Map Audit — Builder's Memory / BlitzBuild selected artifact v1.0.3

Status: real-map source audit complete for this pass  
Authority: exact selected Drive artifact only  
Historical regression ingestion: none  
Runtime execution: not performed

## Target

- Drive filename: `BlitzBuild-v1.0.2.mcworld`
- Drive file ID: `1Z8HrS3UhVRj4r-WAi1wtpqs900xYy7QE`
- Artifact SHA-256: `d3a7082af1c2e5f8ded862f801eaa3880f02beb323280648a243d31e574e5504`
- Behavior Pack manifest: `1.0.3`
- Internal level name: `BlitzBuild v1.0.3 - Barrier Watch`
- Min engine version: `1.26.30`

The Drive filename says v1.0.2 while the selected artifact itself identifies as v1.0.3. This is a metadata/version-label mismatch, not a gameplay finding.

## Proven findings

**0 source-proven gameplay defects admitted in this pass.**

## Historical/high-risk re-checks

### Water outside active plot

Before-event bucket handling validates clicked and adjacent cells, rejects barriers/unloaded/unsupported cells, and requires the target to pass the current player's active plot mutation authority.

Waterlogged ambiguous placement validates both possible cells.

The prior water-outside-plot class is not reproduced by current source.

### Interaction outside plot

Break/place/use mutation is fail-closed outside the active builder's assigned plot. Crafting-table interaction is explicitly denied during gameplay. Native-use-vs-placement is distinguished before mutation authority is evaluated.

### Crafting / item drop

Server world policies disable vanilla recipe access, and build materials are given with inventory lock + keepOnDeath. Build inventory is reconciled rather than treated as freely disposable crafting material.

### Developer skips

Legacy gameplay commands require the existing admin tag. `skip_observation` is admin-gated and still transitions through the normal build path; preparation/reset cannot be skipped.

### Reconnect / stale session

Reconnect requires matching membership, arena, session and generation plus a matching recovery record. Missing/stale membership routes to cleanup/lobby instead of resuming gameplay.

### Reset / persistence

Session/membership persistence is generation-bound. Pre-game reset waits for all configured plots, and block mutation rollback stores both permutation and liquid state.

## Developer diagnostic surface — counter-proof closed

`blitzbuild:status` is registered without the map's own gameplay admin-tag gate, but the only selected-artifact trigger is Minecraft's `/scriptevent` command. Current Bedrock command documentation classifies `/scriptevent` as **Game Directors** permission and **Requires Cheats: Yes**; GameDirectors requires Operator Commands permission for players. Therefore an ordinary non-operator player does not have a selected-artifact invocation path.

The diagnostic handler may remain developer-facing hygiene, but it is **not an unresolved gameplay validation obligation** and is not admitted as a bug.

## Result

Builder's Memory / BlitzBuild selected artifact:

- internal gameplay version **1.0.3**
- Drive filename still says **v1.0.2**
- **0 source-proven gameplay bugs** in this pass

Do not create historical regression entries from this pass.


## Deep multi-arena pass — isolation counter-proof

Background/world-wide loops were rechecked instead of being accepted by name alone.

Current source:
- filters background participant work through `engine.membership(player.id)`;
- derives rollback scope as `arena:<arenaId>`;
- requires `engine.isActiveBuilder(player)` plus `engine.canModify(player, location)` before protected world mutation;
- persists arena runtime and recovery with explicit `arenaId` and generation checks;
- rejects persisted roster/membership mismatches.

Global server policy/statistics loops remain intentionally world-wide but do not own arena gameplay progression.

Result: no additional source-proven cross-arena gameplay defect admitted.
