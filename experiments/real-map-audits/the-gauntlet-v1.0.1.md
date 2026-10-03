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

The Gauntlet v1.0.1: **1 source-proven Major BUG**.

Do not ingest into historical reliability knowledge until the explicit approval boundary is crossed.
