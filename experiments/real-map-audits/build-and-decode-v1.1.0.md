# Real Map Audit — Build & Decode v1.1.0

Status: real-map source audit complete for this pass  
Authority: selected current Drive artifact only  
Historical regression ingestion: not yet approved  
Runtime execution: not performed

## Target

- Drive folder: `Build - Build & Decode`
- Drive file: `Build & Decode v1.1.0.mcworld`
- Drive file ID: `1aBAM5Hwu58klnGV1dtZZLffgJATPRmtd`
- Artifact SHA-256: `d83cd5e699dfe2676a540a3cdca2b4797a34c75984cac3142488a1556cff7030`
- Behavior/Resource Pack manifest version: `1.1.0`
- Internal level name: `Build & Decode v1.1.0`

## Proven finding

### DESIGN_MISMATCH — Temporary coordinate-picker dev tool is enabled in production for non-admin players

Severity: Minor  
Proof: source-proven  
Domain: ui-feedback / world-interaction / developer tooling

#### Issue

The production script entry imports a standalone temporary developer coordinate picker. Any player holding a normal Minecraft stick can trigger it; the tool explicitly has no admin requirement.

#### Expected

Temporary coordinate/debug tooling should not be active in the production player interaction surface, or it should be permission-gated to developer/admin users.

#### Observed

Production entry:

```text
behavior_packs/Build_Decode_BP/scripts/main.js:1
import "./dev/debug-stick.js";
```

The imported module describes itself as:

```text
Standalone temporary coordinate picker.
No admin tag required.
```

and subscribes directly to:

```text
world.beforeEvents.playerInteractWithBlock
```

When the held item is `minecraft:stick`, it:

- cancels the normal block interaction;
- records world coordinates in a shared in-memory selection set;
- sends the selected coordinate JSON to the player;
- lets a sneaking player clear the shared selections for all players.

Relevant file:

```text
behavior_packs/Build_Decode_BP/scripts/dev/debug-stick.js
```

Arena interaction protection also explicitly lets stick interactions pass through its normal guard:

```text
ArenaService.js
if (GAME_ITEMS.has(type) || type === "minecraft:stick") return;
```

Builders run in Creative during the building phase, so a normal stick is obtainable without requiring the map to grant one explicitly.

#### Reproduction

1. Enter a build round as the current builder.
2. Obtain/hold `minecraft:stick` in Creative.
3. Interact with any block.
4. Normal interaction is cancelled and a coordinate-picker debug message/JSON is sent.
5. Sneak + interact with the stick.
6. The global temporary selection list is reset for all users of the tool.

#### Player-visible consequence

Production players can enter an unintended developer interaction mode and receive implementation/debug output. Stick interactions are intercepted by tooling unrelated to the game objective.

#### Repair direction

Remove the dev import from production entry, or gate the tool behind the existing admin/developer permission owner. Do not add another permission system.

## Checked and not admitted

### Plot / dangerous interaction protection

Current source has explicit before-event protection for:

- block break outside the builder's active plot;
- place/interaction targeting outside the plot;
- water/lava and other dangerous items;
- doors/buttons/levers and other mutable world interactions;
- explosions.

No current plot-boundary blocker was admitted from this source pass.

### Reconnect / pause

The session lifecycle persists resumable arena state, pauses safe phases when participants are unavailable, and keeps recovery intent for reconnect. No source-proven reconnect reset defect was admitted in this pass.

## Result

Build & Decode v1.1.0: **1 source-proven DESIGN_MISMATCH (Minor)**.

Do not promote it to historical reliability knowledge until the approval boundary is crossed.
