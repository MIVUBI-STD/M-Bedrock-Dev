# Script API Lifecycle Intelligence

M-Bedrock-Dev tracks evidence-backed Script API lifecycle transitions separately from introduction-version and prerelease compatibility.

## States

A registered symbol can resolve to:

- `active` — no lifecycle transition applies to the declared module version;
- `deprecated` — Microsoft documentation explicitly marks the symbol deprecated for the relevant prior API line;
- `removed` — the manifest declares a module version at or beyond the documented removal version;
- `unknown` — the module version/track cannot be classified safely.

A lifecycle rule may have a removal without a prior deprecation state. This matters for enum migrations such as lowercase `GameMode` members:

```text
GameMode.adventure + @minecraft/server 1.x → active
GameMode.adventure + @minecraft/server 2.x → removed
```

The analyzer does not invent a deprecation phase when Microsoft only documents removal.

## Observable symbol kinds

Lifecycle coverage now includes:

- methods;
- event properties;
- ordinary receiver properties;
- imported enum members.

All four kinds flow into the same evidence-backed lifecycle diagnostics and usage inventory.

## Property inference

Property access uses the same bounded receiver flow as methods.

Example:

```text
world.getAllPlayers()[0]
        ↓
      Player
        ↓
inputPermissions
        ↓
PlayerInputPermissions
        ↓
cameraEnabled
```

This allows exact detection of:

- `PlayerInputPermissions.cameraEnabled`;
- `PlayerInputPermissions.movementEnabled`.

Both are marked deprecated in the prior 1.x documentation and scheduled for removal in 2.0.0.

Scaffolding properties such as `world.beforeEvents` and `world.afterEvents` are excluded from generic property inventory because event subscriptions already own that semantic surface.

## Enum binding inference

Named imports from `@minecraft/server` are tracked by imported and local binding name.

Both forms resolve identically:

```ts
import { GameMode } from "@minecraft/server";
GameMode.adventure;

import { GameMode as GM } from "@minecraft/server";
GM.adventure;
```

The canonical symbol is `GameMode.adventure`.

Initial enum lifecycle rules cover:

- `GameMode.adventure` → `GameMode.Adventure`;
- `GameMode.creative` → `GameMode.Creative`;
- `GameMode.spectator` → `GameMode.Spectator`;
- `GameMode.survival` → `GameMode.Survival`;
- `EntityDamageCause.suicide`;
- `EntityComponentTypes.GroundOffset`.

The replacement uppercase `GameMode` members are represented as known active members so they do not become false knowledge gaps.

## Diagnostics

Deprecated usage emits:

`SCRIPT_API_DEPRECATED_SYMBOL`

with minor severity.

Removed usage emits:

`SCRIPT_API_REMOVED_SYMBOL`

with critical severity when the declared module line is at or beyond the documented removal version.

Each finding records:

- exact symbol;
- `symbolKind` (`method`, `event`, `property`, or `enum`);
- declared module version/track;
- lifecycle state;
- removal version;
- rule id;
- official replacement when documented.

## Evidence boundary

The prior 1.x documentation is a family view rather than a precise deprecation-introduction timeline. The analyzer therefore says "deprecated in documented 1.x" when that is the strongest official claim available.

Current explicit blindspots:

- namespace imports such as `import * as mc` for enum-member inference;
- type-only symbols and removed interfaces/classes;
- changed enum backing values where the member itself remains present;
- function/method signature changes;
- argument-shape and return-shape migrations;
- dynamic computed property/member access.

Unknown lifecycle is never treated as removed.
