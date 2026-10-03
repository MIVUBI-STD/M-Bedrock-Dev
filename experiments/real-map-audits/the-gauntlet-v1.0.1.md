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

### BUG — Level 9 can complete while a required party member is disconnected

Severity: Major  
Proof: source-proven  
Domain: game-flow / multiplayer-session / persistence

#### Authored expectation

Level 9 explicitly tells players:

```text
Wait here until all players reach the finish platform.
```

The run stores the original `playerIds` for the party and Level 9 completion is intended to wait for that party.

#### Observed source behavior

The generic position helper removes missing/offline players before checking the completion predicate:

```text
Ge(...)
→ playerIds.filter(id => playersById.has(id))
→ every remaining online player must be inside bounds
```

`Gf()`, the Level 9 finish predicate, calls that helper directly using the run's original `playerIds`.

During Level 9 tick:

```text
CP()
→ Hp(...)
→ Gf({ playerIds: run.playerIds, playersById: current world players, ... })
→ if true: phase = "level_9_complete"
```

So a disconnected member is removed from the set that must be in the finish area.

The party layer does **not** immediately terminate or pause the started run when one member disconnects. It keeps the party started during a recovery window:

```text
disconnectedMemberRecoveryTicks = 20 * 60 * 3
startedPartyOfflineResetGraceTicks = 20 * 60 * 3
```

For a started party with at least one player still online, `xd()` accumulates disconnected time and resets the party only after the 3-minute recovery threshold.

Therefore, during that window:

```text
original party = A + B
B disconnects
party remains started
playersById contains A only
A enters Level 9 finish area
Gf() evaluates only A
→ Level 9 completes
```

#### Reproduction

1. Start The Gauntlet with at least two players.
2. Reach Level 9.
3. Keep Player A online.
4. Disconnect Player B before both players enter the finish platform.
5. Within the 3-minute disconnected-member recovery window, move Player A into the finish area.
6. Observe Level 9 transition to complete even though Player B never reached the finish platform.

#### Player-visible consequence

A party can bypass a cooperative completion requirement by losing a participant temporarily. A reconnecting player may return after the run has already advanced beyond the level they never completed.

#### Root cause

Level completion resolves participation from **currently present world players**, while party/run ownership is based on the original locked `playerIds`. The two participation models diverge during disconnect recovery.

#### Repair direction

Keep one party-authority rule:

- if Level 9 requires all locked party members, completion must require every required `run.playerIds` member to be present and in the finish area; or
- explicitly pause Level 9 progression while any required member is disconnected.

Do not solve by creating another participant registry.

## Checked but not admitted

### Full-party offline reset

If all started-party members are offline, the party layer separately tracks offline grace and eventually resets the party. This does not prevent the partial-disconnect Level 9 bypass because the bug occurs while at least one member remains online.

### Exit voting

Exit-vote quorum intentionally uses currently online participants. This is a separate authored operation and is not used as proof for Level 9 completion semantics.

## Result

The Gauntlet v1.0.1: **1 source-proven Major BUG**.

Do not ingest into historical reliability knowledge until the explicit approval boundary is crossed.
