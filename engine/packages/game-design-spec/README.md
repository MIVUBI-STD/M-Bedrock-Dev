# Game Design

Typed contracts for explicit map/mode intended gameplay.

This package does not infer design from map implementation. Reconstruction belongs to `gameplay-intent`; Minecraft facts belong to `knowledge`; implementation safety requirements belong to `engine/contracts/engineering`.


## Compiler boundary

Game Design may declare design-owned constraints. The deterministic compiler never invents defaults.

Inventory/spatial contracts can be emitted when their design rules are explicit. Combat/economy currently also contain engineering-owned safety fields in their runtime contract shapes, so the compiler records design constraints but intentionally leaves the full runtime contract unresolved until Engineering Contract input is composed.
