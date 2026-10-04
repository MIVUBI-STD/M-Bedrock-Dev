# Real Map Audit — Orb of the Illusioner Level 2 v1.1.0

Status: real-map source audit complete for this pass  
Authority: selected current Drive artifact only  
Historical regression ingestion: not yet approved  
Runtime execution: not performed

## Target

- Drive filename: `Orb of the Illusioner Level 2.mcworld`
- Drive file ID: `1o6LDmNJZfCPqQzQRmDILIFz0PDzVYcuv`
- Artifact SHA-256: `b17661f9330f4a80301a6a2559b0dcf945204fa6ed9d8d3cf75f7350b369cb2e`
- BP/RP manifest version: `1.1.0`
- Internal level name: `Orb of the Illusioner Level 2`

The Drive filename does not expose a version; version 1.1.0 is taken from the selected artifact manifests.

## Proven finding

### BUG — Weapon and armor upgrades consume coins then fail on an undefined material identifier

Severity: Major  
Proof: source-proven  
Domain: inventory / economy / upgrade transaction

#### Issue

The normal weapon and armor upgrade UI calls UpgradeManager upgrade operations. Both operations consume the configured coin cost first, then reference an identifier named `material` that is never declared in the selected artifact. Module code therefore throws a ReferenceError after currency has already been removed.

#### Expected

A successful purchase should derive the target material from the requested tier, replace the item/equipment, persist the tier, and only commit currency when delivery can complete. A failed upgrade must not consume coins.

#### Observed source behavior

Weapon upgrade:

~~~text
upgradeWeapon(player, targetTier)
→ validate tier and coins
→ consumeCoins(player, cost)
→ replaceWeaponInInventory(player, material, weaponType)
→ setWeaponTier(...)
~~~

Armor upgrade:

~~~text
upgradeArmorPiece(player, piece, targetTier)
→ validate tier and coins
→ consumeCoins(player, cost)
→ replaceArmorPiece(player, piece, material)
→ setArmorPieceTier(...)
~~~

Repository-wide selected-artifact search finds no declaration for the referenced `material` identifier. The replacement helpers instead accept a material parameter and construct item IDs from it.

The normal player UI reaches these functions directly:

~~~text
showWeaponUpgrade(...)
→ upgradeManager.upgradeWeapon(player, nextTier)

showArmorUpgrade(...)
→ upgradeManager.upgradeArmorPiece(player, selected.piece, selected.nextTier)
~~~

The outer try/catch converts the ReferenceError into `Upgrade failed`, but it does not refund the coins already consumed.

#### Reproduction path

1. Enter a normal Orb L2 session and obtain enough coins for a weapon or armor upgrade.
2. Open the normal kit/upgrade UI.
3. Purchase the next valid weapon tier or armor-piece tier.
4. Coin consumption succeeds.
5. The upgrade operation evaluates the undeclared `material` identifier and throws.
6. The player receives an upgrade-failed message while the spent coins are not restored.

#### Player-visible consequence

The weapon/armor upgrade economy is broken for ordinary purchases: players can lose currency without receiving the purchased upgrade.

#### Root cause

The transaction omitted derivation of the target material (for example from SwordTiers/AxeTiers/ArmorTiers or the existing tier helper) before committing currency, and coin consumption occurs before the failing delivery step.

#### Repair direction

Derive and validate the target material before currency mutation. Keep the existing UpgradeManager as the single owner and make the purchase atomic: validate target/delivery first, then consume coins and apply/persist the upgrade, or refund on any post-consumption failure.


## Proven finding 2

### BUG — Active-game reload recovery aborts the arena because barricade validation references an undefined variable

Severity: Major  
Proof: source-proven  
Domain: persistence / reload recovery / arena lifecycle

#### Issue

When an active Offense game is restored after world/script reload, the manager schedules barricade-state validation after 40 ticks. That validation iterates `selectedBarricades`, but the identifier exists only as a parameter of a different method and is not declared in `validateBarricadeStates()`.

#### Expected

An active persisted game should resume and reconcile the configured barricades for each stage without terminating the arena.

#### Observed source behavior

Resume path:

~~~text
tryResumeGame()
→ offense_game_running is true
→ restart HUD and area-check loops
→ schedule tryResumeGame:1 after 40 ticks
~~~

The registered resume job calls:

~~~text
tryResumeGame:1
→ validateBarricadeStates()
~~~

Inside that method:

~~~text
for each stage
→ for (const barricadeData of selectedBarricades || stage.barricades)
~~~

`selectedBarricades` is not declared in this method or enclosing module scope. The selected artifact's original source also produces a TS2304 unknown-identifier diagnostic for this exact runtime reference.

The arena scheduler catches the resulting ReferenceError. Only stale native-entity errors may be skipped; arbitrary logic errors are classified as `recover_arena` and rethrown. The main active-arena tick loop catches that error and calls `recover(id, error)`, which disposes the active context, resets the arena, and sends current members back to lobby with the internal-error recovery message.

#### Reproduction path

1. Start Orb of the Illusioner Level 2 and reach an active Offense game state.
2. Reload/restart the world or script runtime while persisted `offense_game_running` remains true.
3. Allow the restored arena to initialize.
4. After the scheduled 40-tick resume delay, `validateBarricadeStates()` runs.
5. The undeclared `selectedBarricades` reference throws.
6. The active arena enters `recover_arena`, is disposed/reset, and players are returned to lobby.

#### Player-visible consequence

A valid active game cannot survive the authored reload/resume path; recovery itself terminates the session instead of resuming it.

#### Root cause

The resume-only barricade reconciliation path references a local parameter name from `spawnBarricades()` that does not exist in `validateBarricadeStates()`.

#### Repair direction

Iterate the stage's configured barricades directly (or pass an explicit selected set through the existing owner if selection is genuinely required). Keep the current arena recovery owner; fix the invalid resume callback rather than adding a second recovery path.

## Important false-positive check — temporary coordinate picker

The production bundle contains `temperory-tools` coordinate-picker code that reacts to `minecraft:stick` and explicitly says no admin tag is required.

This is **not admitted as a current player-facing defect** from source alone because:

- normal non-admin gameplay is forced out of Creative/Spectator by the current anti-cheat owner;
- current configured kits/shop surfaces inspected in this pass do not provide a stick;
- no normal selected-artifact progression path to the required trigger item was proven.

A later selected-artifact reachability pass closes this as source-hygiene only: no ordinary-player stick/plank acquisition path was proven under the current block-break policy.

## Checks completed

### Session persistence / reconnect

Arena sessions and cleanup are persisted. Rejoin restores current active arena context from persisted run ownership. Finalization/cleanup has its own journal and can resume after reload.

### Chunk/ticking ownership

The current artifact has a dedicated chunk-recovery/lease owner, with retained arena context and recovery operations rather than an unowned global ticking assumption.

### Admin/debug commands

Current administrative commands inspected in the main orchestration path require explicit permission/admin ownership. No normal-player skip route was admitted.

## Result

Orb of the Illusioner Level 2 v1.1.0: **2 source-proven Major BUGs**.

Do not create historical regression entries from this pass.


## Deep multi-arena pass — arena-context isolation

Orb L2 generates six arenas and routes active gameplay through arena-bound contexts. The deeper pass challenged player lookup, entity lookup, scheduler callbacks, recovery, and cleanup for cross-arena leakage.

The current context layer keeps player/entity operations bound to the active arena/run, and persisted recovery is resolved against that same ownership. No source-proven A→B player/entity/score/cleanup contamination was established.

The two existing Major findings remain independent:
- the upgrade transaction fails because `material` is undefined;
- reload recovery fails because `selectedBarricades` is undefined.

Neither requires cross-arena interference to manifest.

Result of this multi-arena pass: **no additional source-proven cross-arena defect**.


## Temporary picker reachability closure

The production temporary coordinate picker reacts to `minecraft:stick`, but a fresh reachability pass did not establish a normal-player trigger path.

Current selected artifact:

- normal gameplay can place players in Survival;
- ordinary block breaking is still policy-controlled: non-admin break events are cancelled unless the block type is explicitly in the allowed set;
- the default allowed-block set is empty at initialization;
- plank identifiers found in the main bundle are generic item/block catalog entries rather than gameplay grants;
- no ordinary gameplay grant/shop path to `minecraft:stick` or craftable planks was found.

World geometry containing planks is therefore not itself acquisition proof because the current break policy blocks ordinary harvesting.

Result: retain the picker as production hygiene only. Do not promote it to a player-facing defect without new selected-artifact acquisition evidence.
