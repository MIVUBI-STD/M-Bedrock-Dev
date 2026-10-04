# Real Map Audit — The Gauntlet v1.0.1

Status: source-proven real-map audit evidence  
Authority: selected current Drive artifact only  
Historical regression ingestion: not yet approved  
Runtime execution: not performed

## Target

- Drive folder: `Minigame - The Gauntlet`
- Drive file: `The Gauntlet v1.0.1.mcworld`
- Drive file ID: `1rFpeCtfpsv6D0g9S4HvZ8T_JmOeTzgwC`
- Artifact SHA-256: `68d062f8cee3167baa808e18e1b537d4961570dbfaac9305286dca6748619f7f`
- BP/RP manifest version: `1.0.1`
- Min engine version: `1.21.130`

## Proven finding

### BUG — Required-party progression gates can ignore disconnected members

Severity: Major  
Proof: source-proven  
Domain: game-flow / multiplayer-session / persistence

#### Authored expectation

The run stores the original playerIds for the locked party. Multiple cooperative progression gates are authored as all-player conditions, including Level 6/7 completion checks, repeated level-entry/transition bounds, Level 9's explicit “wait until all players reach the finish platform” condition, later level transitions, and the final Level 15 positional completion gate.

#### Observed source behavior

The shared all-player helpers first reduce the required run.playerIds to players that are currently present in playersById:

~~~text
Ge(...)
→ playerIds.filter(id => playersById.has(id))
→ every remaining online player must be inside bounds

Ht(...)
→ playerIds.filter(id => playersById.has(id))

zo(...)
→ Ht(...)
→ every remaining online player must be in includedPlayerIds

st(...)
→ Ht(...)
→ every remaining online player must be inside one of the required bounds
~~~

These helpers are not limited to Level 9. Current selected-artifact call sites use them across multiple progression boundaries:

- Ge(...) is used for repeated level-entry/transition gates before and through Level 9.
- zo(...) is used by cooperative Level 6 and Level 7 completion state.
- Gf(...) uses Ge(...) for the Level 9 finish platform.
- st(...) is used by later level transitions and the final Level 15 positional completion gate.

The party layer does not immediately terminate or pause a started run when one required member disconnects. It preserves the started party during the configured recovery window:

~~~text
disconnectedMemberRecoveryTicks = 20 * 60 * 3
startedPartyOfflineResetGraceTicks = 20 * 60 * 3
~~~

Therefore a partial disconnect changes the set evaluated by all-player progression without changing the locked run.playerIds authority. While at least one member remains online, an incomplete cooperative gate can become satisfiable by only the remaining online members.
#### Reproduction

1. Start The Gauntlet with at least two locked party members.
2. Reach any cooperative progression gate backed by Ge, zo, Gf, or st (Level 9 is the simplest deterministic example).
3. Disconnect Player B before the required all-player condition is satisfied.
4. Keep Player A online during the three-minute disconnected-member recovery window.
5. Have Player A satisfy the remaining online-player predicate for that gate.
6. Observe progression being allowed even though Player B did not satisfy the cooperative requirement.

For Level 9 specifically, Player A can enter the finish platform while Player B is offline and the level can complete.
#### Player-visible consequence

A party can bypass multiple cooperative/all-player progression requirements by temporarily losing a participant. A reconnecting player may return after the run has advanced through a gate or level they never completed.

#### Root cause

Shared progression helpers resolve required participation from currently present world players, while party/run ownership remains based on the original locked playerIds. The two participation models diverge during disconnect recovery.

#### Repair direction

Keep one party-authority rule:

- for every all-player/cooperative gate, require every locked run.playerIds member to be present and satisfy that gate; or
- explicitly pause cooperative progression while any required member is disconnected.

Do not solve by creating another participant registry.

## Checked but not admitted

### Full-party offline reset

If all started-party members are offline, the party layer separately tracks offline grace and eventually resets the party. This does not prevent the partial-disconnect progression bypass because the bug occurs while at least one member remains online.

### Exit voting

Exit-vote quorum intentionally uses currently online participants. This is a separate authored operation and is not used as proof for Level 9 completion semantics.

## Result

The Gauntlet v1.0.1: **2 source-proven Major BUGs**.

Do not ingest into historical reliability knowledge until the explicit approval boundary is crossed.


## Client-reported issue re-check — developer skip/retry items

The client reported that students can skip a level with a stick and retry it with a blaze rod.

The selected v1.0.1 source confirms the developer tooling is live:

```text
devSkipLevel.enabled = true
devSkipLevel.itemId = "minecraft:stick"
devRetryLevel.enabled = true
devRetryLevel.itemId = "minecraft:blaze_rod"
```

Production `itemUse` handlers call the skip/retry operations for the player's current arena and **do not consult the existing developer-permission registry**.

This establishes the unsafe capability path once an ordinary player possesses the trigger item. The client additionally reports ordinary stick reachability from arena resources/crafting; current world-container proof for that inventory path still needs to be bound before this becomes a fully selected-artifact PROVEN report finding.

Keep as a high-priority gameplay-translation obligation:
- prove ordinary-player stick/blaze-rod reachability in the selected world;
- if reachable, promote the stick path at least as a Major progression bypass.


## Proven finding 2 — client-reported developer capability reachability

### BUG — Ordinary players can craft the live developer skip item and skip the current level

Severity: Major  
Proof: source-proven  
Domain: progression / developer capability exposure

#### Issue

The release enables the developer level-skip tool on `minecraft:stick`, and its normal `itemUse` path does not consult the existing developer-permission registry.

The selected artifact also gives ordinary players a deterministic route to obtain the trigger item. Level 13 runs players in Survival, loads the authored reference build, derives required block types from that build, and distributes those requirements into player-accessible resource barrels. The current `chest_build.mcstructure` contains both `minecraft:oak_planks` and `minecraft:dark_oak_planks`, so planks are part of the authored resource distribution. Ordinary Minecraft crafting can turn two planks into sticks.

#### Expected

Release gameplay must not expose level-skip capability to ordinary students. Developer skip/retry controls must require the existing developer permission owner or be disabled in the release.

#### Observed source behavior

Release configuration:

```text
devSkipLevel.enabled = true
devSkipLevel.itemId = "minecraft:stick"
```

The player item-use handler invokes the current arena's skip operation from the configured item trigger without checking developer permission.

Level 13 player permissions explicitly use Survival mode. Its initialization:

```text
reference build
→ derive block requirements
→ split requirements across west/east resource barrels
→ players gather resources from those barrels
```

The selected `chest_build.mcstructure` contains oak and dark-oak planks, providing the crafting prerequisite for a stick.

#### Reproduction path

1. Start The Gauntlet as a normal non-developer player and reach Level 13.
2. Take oak/dark-oak planks from the authored resource barrels.
3. Craft a normal Minecraft stick in the player crafting grid.
4. Hold/use the stick while the level is active.
5. Confirm the current level is skipped for the arena/team even though the player has no developer permission.

#### Player-visible consequence

A normal student can bypass required progression and advance the whole arena using a developer test control left active in the release.

#### Root cause

Developer capability exposure is gated only by possession of the trigger item. The release leaves that capability enabled, omits the existing developer authorization check, and the normal gameplay resource/crafting path makes the trigger reachable.

#### Repair direction

Disable the item-triggered developer skip/retry controls in release builds, or gate them through the existing developer-permission owner before executing any progression mutation.
