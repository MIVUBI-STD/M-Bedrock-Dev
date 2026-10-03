# Real Map Audit — Five Nights at Z Village Level 1 v1.1.0

Status: real-map source audit complete for this pass  
Authority: selected current Drive artifact only  
Historical regression ingestion: none  
Runtime execution: not performed

## Target

- Drive project: `PvP - Five Nights at Z Village / Level 1`
- Drive file: `Five Nights at Z Village v1.1.0.mcworld`
- Drive file ID: `1npTapvqtd_Yyd1gOch6U03SIPzkY-pUK`
- Artifact SHA-256: `6910cb83e6d5866896e29553398b3a889e3942f553f9a0423b365f0799018bf2`
- BP/RP manifest version: `1.1.0`
- Min engine version: `1.21.130`
- Internal level name: `Five Nights at Z Village lvl 1`

## Proven findings

**0 source-proven gameplay defects admitted in this pass.**

## Historical issue re-checks

### keepInventory / player death state

Current world setup explicitly applies:

```text
keepInventory = true
```

and owns world rules through the current setup service. The old keep-inventory mismatch is not reproduced.

### Duplicate armor / upgrade purchase

Current upgrade purchase reconciles persisted scoreboard level against the player's actual owned gear and refuses a purchase when the same or higher tier is already owned:

```text
getActualUpgradeLevel(...)
max(savedLevel, actualLevel)
→ if owned >= target tier
→ reject "already own this gear tier or a higher one"
```

Payment/application failures refund coins and roll upgrade state back.

The historical duplicate-armor purchase issue is not reproduced.

### Enchantment purchase without effect

Current enchant purchase:

1. rejects already-owned level;
2. consumes coins;
3. persists requested enchant level;
4. applies upgrades;
5. verifies the player actually has the enchant level;
6. rolls back scoreboard state and refunds coins on failure.

The old "coins consumed but enchant not applied" issue is not reproduced.

### Spawn failure / wave softlock

Current wave-spawn recovery retries failed spawns. The current source also contains explicit recovery and safe-session termination paths rather than silently advancing invalid progression.

No current source proof was found for the old unloaded-spawn auto-win / wave-softlock behavior.

### Bridge/path recovery

The current artifact creates an arena-specific bridge ticking area and has route-scoped stuck-zombie recovery. Recovery can restore missing canonical path nodes and refuses unsafe long-distance teleport recovery.

Historical bridge/pathing problems therefore require fresh runtime proof and are not copied into this version.

### Reconnect

A player carrying the current arena session tag is reconciled on player spawn. Active-session recovery restores gameplay mode/input/loadout/arena position, while countdown state remains spectator.

No source-proven reconnect loadout-loss defect was admitted.

## Audit obligations — not bugs

- Entity navigation remains runtime-sensitive; the static recovery logic does not prove every route succeeds under the target runtime.
- Chunk/ticking behavior should be runtime-validated if real gameplay still shows missed spawns or route stalls.

## Result

Five Nights at Z Village Level 1 v1.1.0:

- **0 source-proven gameplay bugs**
- historical shop/inventory/spawn/path issues are not reproduced by current source
- runtime-sensitive entity/navigation behavior remains validation work only

Do not create historical regression entries for this map from this pass.
