# Script API Lifecycle Intelligence

M-Bedrock-Dev tracks evidence-backed Script API lifecycle transitions separately from introduction-version and prerelease compatibility.

## States

A registered symbol can resolve to:

- `active` — no lifecycle transition applies to the declared module version;
- `deprecated` — Microsoft 1.x documentation explicitly marks the symbol deprecated and scheduled for removal;
- `removed` — the manifest declares a module version at or beyond the documented removal version;
- `unknown` — the module version/track cannot be classified safely.

The current lifecycle boundary is version-aware:

```text
@minecraft/server 1.x  + registered legacy symbol → deprecated
@minecraft/server 2.x  + symbol removed in 2.0.0 → removed
unknown module track                         → unknown
```

## Diagnostics

Deprecated usage emits:

`SCRIPT_API_DEPRECATED_SYMBOL`

with minor severity. It is migration debt, not proof that the current 1.x map is broken.

Removed usage emits:

`SCRIPT_API_REMOVED_SYMBOL`

with critical severity because the manifest targets an API line where Microsoft documents that symbol as removed.

Lifecycle findings record the exact symbol, declared version/track, removal version, rule id, and replacement when an official replacement is documented.

## Initial evidence-backed seed

Methods:

- `world.playSound` → deprecated in documented 1.x, removed in 2.0.0; use `Dimension.playSound`;
- `Dimension.runCommandAsync` → deprecated in 1.x, removed in 2.0.0;
- `Entity.runCommandAsync` → deprecated in 1.x, removed in 2.0.0;
- `Entity.isValid()` → method removed in 2.0.0 in favor of the `isValid` property;
- `ScoreboardObjective.isValid()` → method removed in 2.0.0 in favor of the property form.

Events:

- `world.beforeEvents.worldInitialize`;
- `world.afterEvents.worldInitialize`;
- `world.beforeEvents.itemUseOn` → use `playerInteractWithBlock`;
- `world.afterEvents.itemUseOn` → use `playerInteractWithBlock`;
- `world.afterEvents.entityHurt`.

These event properties are documented in the prior 1.x API and recorded as removed in 2.0.0.

## Evidence boundary

The prior documentation is a 1.x family view rather than a precise deprecation-introduction changelog. Therefore the analyzer intentionally models "deprecated in documented 1.x" rather than inventing an exact deprecation start version.

Removed properties, enum values, type aliases, argument-shape changes, and other non-call symbols are not yet covered by the method/event parser. They remain a separate static-analysis blindspot until the parser can observe them deterministically.

Unknown lifecycle is never treated as removed.
