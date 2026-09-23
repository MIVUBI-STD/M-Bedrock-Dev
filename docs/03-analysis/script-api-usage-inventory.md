# Script API Usage Inventory

Script API compatibility knowledge is expanded from observed map usage rather than from a broad generated API inventory.

## Per-map inspection

Every `inspect` result includes `scriptApiUsage`.

The inventory records four Script API symbol kinds:

- `event`;
- `method`;
- `property`;
- `enum`.

For every observed symbol it records:

- occurrence count;
- source files;
- `known` versus `unclassified` knowledge state;
- registered rule and lifecycle metadata when known;
- direct versus bounded inference counts for receiver-backed methods/properties;
- inferred receiver classes where applicable.

An unclassified symbol is evidence of missing knowledge, not evidence of a map defect.

## Portfolio inventory

Use the dedicated CLI over one or more real map artifacts:

```bash
npm run cli -- script-usage map-a.mcworld map-b.mcworld map-c.mcworld
```

The portfolio report aggregates symbols across artifacts and records:

- total occurrences;
- number of maps containing each symbol;
- source-file coverage;
- current compatibility/lifecycle knowledge;
- `promotionCandidates` for observed but unclassified symbols.

Promotion candidates are ordered by map coverage before raw occurrence count. A symbol repeated many times in one map therefore does not automatically outrank a symbol observed across many independent maps.

## Lifecycle-aware inventory

Known lifecycle data is retained in inventory items.

This allows portfolio evidence to distinguish:

```text
observed + active
observed + deprecated
observed + removed for the target module line
observed + unclassified
```

Properties such as `PlayerInputPermissions.cameraEnabled` and enum members such as `GameMode.adventure` therefore participate in the same usage pipeline as methods and events.

## Semantic ownership and noise control

Event-container properties such as:

```text
world.beforeEvents
world.afterEvents
system.beforeEvents
system.afterEvents
```

are excluded from generic property usage because event subscriptions already own that semantic surface.

Valid ordinary properties such as `world.scoreboard` and `Player.inputPermissions` remain inventory items.

Named-import enum access is canonicalized through the imported symbol name. For example:

```ts
import { GameMode as GM } from "@minecraft/server";
GM.adventure;
```

is inventoried as:

`GameMode.adventure`

Namespace imports and dynamic/computed members remain unclassified until production usage justifies bounded support.

## Promotion contract

A promotion candidate does not become a compatibility rule automatically.

Before promotion:

1. confirm parser classification;
2. establish official version/lifecycle provenance;
3. add the smallest evidence-backed compatibility rule;
4. add regression coverage;
5. keep the symbol unclassified when evidence is insufficient.

This preserves the evidence-first rule used by the rest of M-Bedrock-Dev.

## Current boundary

Portfolio inventory is repository-verified for event, method, property, and named-import enum symbols.

Production-map diagnosis quality remains a separate proof lane. A representative map portfolio must be inspected before symbol-frequency or lifecycle-exposure distributions can be treated as production evidence.


## Method call-shape evidence

Method inventory also retains observed call-shape distributions when available.

Each distinct shape records:

- argument count;
- coarse argument kinds;
- spread-argument presence;
- occurrence count;
- files containing that shape.

Signature-matrix symbols are treated as known even when they do not need a separate introduction/lifecycle rule. This prevents methods such as `Entity.applyKnockback` from appearing as false promotion candidates while still preserving their real-world call forms.


## Return-use evidence

Method inventory also retains direct result-use distributions:

```text
ignored
assigned
returned
dereferenced
optional-dereferenced
non-null-asserted
other
```

Return-contract rules can therefore distinguish a direct unsafe-looking dereference from optional chaining without requiring full program-wide type flow. Assigned/returned results remain conservative because downstream guards are not inferred yet.
