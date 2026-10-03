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


## Important false-positive check — temporary coordinate picker

The production bundle contains `temperory-tools` coordinate-picker code that reacts to `minecraft:stick` and explicitly says no admin tag is required.

This is **not admitted as a current player-facing defect** from source alone because:

- normal non-admin gameplay is forced out of Creative/Spectator by the current anti-cheat owner;
- current configured kits/shop surfaces inspected in this pass do not provide a stick;
- no normal selected-artifact progression path to the required trigger item was proven.

Keep it as source-hygiene/developer-tool residue unless runtime evidence proves a player-reachable stick path.

## Checks completed

### Session persistence / reconnect

Arena sessions and cleanup are persisted. Rejoin restores current active arena context from persisted run ownership. Finalization/cleanup has its own journal and can resume after reload.

### Chunk/ticking ownership

The current artifact has a dedicated chunk-recovery/lease owner, with retained arena context and recovery operations rather than an unowned global ticking assumption.

### Admin/debug commands

Current administrative commands inspected in the main orchestration path require explicit permission/admin ownership. No normal-player skip route was admitted.

## Result

Orb of the Illusioner Level 2 v1.1.0: **1 source-proven Major BUG**.

Do not create historical regression entries from this pass.
