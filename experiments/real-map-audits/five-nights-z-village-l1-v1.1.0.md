# Real Map Audit — Five Nights at Z Village Level 1 v1.1.0

Status: source-proven real-map audit evidence  
Authority: selected current Drive artifact only  
Historical regression ingestion: not yet approved  
Runtime execution: not performed

## Target

- Drive folder: `PvP - Five Nights at Z Village / Level 1`
- Drive file: `Five Nights at Z Village v1.1.0.mcworld`
- Drive file ID: `1npTapvqtd_Yyd1gOch6U03SIPzkY-pUK`
- Artifact SHA-256: `6910cb83e6d5866896e29553398b3a889e3942f553f9a0423b365f0799018bf2`
- BP/RP manifest version: `1.1.0`
- min engine version: `1.21.130`

## Proven finding 1

### BUG — Reconnect during cinematic can preserve stale coin currency into a fresh session

Severity: Major  
Proof: source-proven  
Domain: player-state / economy / reconnect lifecycle

#### Issue

The fresh match reset includes a full `clear @s` inside `prepareCinematicPlayers()`, but that function only receives players who are online when arena loading completes. A party member who disconnects during loading and reconnects after the loading handoff, while the intro cinematic is already running, is not part of that cinematic player set and therefore misses the full clear.

When gameplay begins, the arena-level player tag still makes the reconnected player part of `this.players()`. `reconcileSessionPlayer()` sees `player_kit = 0` and triggers `give_kit`. The kit manager does clean regular inventory/equipment before equipping the default kit, but it deliberately excludes `daigon:coin` from that cleanup. A stale coin stack can therefore survive from the previous/lobby state into the fresh match.

#### Expected

Every participant entering a new Five Nights session must pass the same currency/inventory reset boundary regardless of disconnect/reconnect timing.

#### Observed source behavior

1. At start admission, all current arena players have session upgrade/kit scoreboards reset, including `player_kit`.

2. Loading coordinator tracks the original request players, but completion passes only players currently online:

```text
ArenaLoading.complete()
→ let t = this.onlinePlayers(operation)
→ callbacks.onReady(t)
```

3. `startCinematic(players)` then calls:

```text
prepareCinematicPlayers(players)
→ clear @s
→ clear effects
→ reset upgrade scoreboards
```

Only that online handoff set receives the full inventory clear.

4. A tagged player reconnecting while the cinematic/start lifecycle is still active enters:

```text
reconcileSessionPlayer()
→ if countdownRunning
→ set Spectator
→ return
```

No missed `clear @s` is reconciled there.

5. When gameplay begins, `startGameplay()` iterates `this.players()`, which is based on the persistent arena tag, so the reconnected player is included.

6. Since `player_kit` was reset at the start request, the gameplay reconcile path triggers:

```text
player_kit < 1
→ triggerEvent("daigon:give_kit")
```

7. `give_kit` calls `KitManager.equipKit()`, and `clearPlayerInventory()` explicitly preserves coin items:

```text
if item exists && item.typeId !== daigon:coin
→ clear that item type
```

Equipment is cleared, but `daigon:coin` is intentionally not removed.

Therefore a reconnecting cinematic participant who missed `prepareCinematicPlayers(clear @s)` can carry stale coin currency into the new match.

#### Reproduction path

1. Have a player in an arena party with one or more `daigon:coin` items before starting the next session.
2. Start the arena.
3. Disconnect that player while the arena loading coordinator is still preparing.
4. Let loading finish with the remaining online player(s), so the intro cinematic starts and `prepareCinematicPlayers()` clears only those online players.
5. Reconnect the missing player while the intro cinematic is running.
6. The reconnect handler sets that player to spectator but does not replay the full clear.
7. Let the cinematic finish and gameplay begin.
8. `give_kit` equips the player while preserving `daigon:coin`.
9. Observe stale coin currency available in the fresh session.

#### Player-visible consequence

A player can carry economy currency across a session boundary that is intended to clear all inventory, creating an unfair starting balance and making shop/scoring behavior dependent on reconnect timing.

#### Root cause

The fresh-session full inventory clear is tied to the online cinematic handoff set rather than represented as a per-player session invariant. Kit reconciliation is not an equivalent substitute because coins are intentionally excluded from kit cleanup.

#### Repair direction

Keep one player-state owner. Record whether each session participant completed the fresh-session reset, and reconcile that reset on reconnect before cinematic/gameplay continuation. Do not change the generic kit cleanup rule if coin preservation is intentional for normal mid-session kit reapplication.

## Historical regression checks not admitted as current findings

### Final lobby countdown revalidation — current source fixed

`tickCountdown()` revalidates both conditions immediately before starting:

- online player count must equal stored membership count;
- every member must still be in `readyMembers`.

Leaving the join pad also triggers `leave()` and `refreshCountdown()`.

The earlier final-countdown revalidation defect is not reproduced.

### Enchant purchase consumes coins without effect — current source fixed

`purchaseEnchant()` now:

1. rejects already-owned levels;
2. checks affordability;
3. removes coins;
4. persists the scoreboard upgrade;
5. applies player upgrades;
6. verifies the actual enchantment level;
7. restores previous score and refunds coins if persistence/application/verification fails.

The historical non-atomic enchant purchase path is not reproduced.

### Duplicate armor/gear purchase — current source fixed

`purchaseUpgrade()` compares persisted and actual equipment tier, rejects same/higher tiers, requires the immediately previous tier, and refunds if state/application fails.

### Bridge/pathing regression — current source hardened

Current source contains explicit canonical route reconstruction, chunk-loaded checks, missing path restoration, stuck-zombie recovery, bounded safety teleport, and bridge ticking-area creation/removal.

The historical simple bridge-path blocker is not reproduced from current source.

### Unloaded spawn / early-win history

Current source uses a five-anchor loading coordinator that verifies arena paths, icons, shop NPC, and gatekeeper before cinematic handoff. During active gameplay it creates a bridge ticking area and `spawnZombie()` refuses to advance spawn progress until the target spawn chunk is loaded, retrying later.

A runtime test is still appropriate for cave/windmill simulation residency, but this static pass does not prove the historical auto-win path remains current.

## Result

Five Nights at Z Village Level 1 v1.1.0 is closed for this bounded source batch with **1 current source-proven gameplay finding**.
