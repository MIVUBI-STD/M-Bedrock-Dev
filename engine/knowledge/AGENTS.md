# Knowledge Agent Rules

Applies to machine-readable Bedrock / Education knowledge under `engine/knowledge/`.

## Routing

Select the smallest domain group from `ownership.json` before reading catalogs:

- `platform` — product/edition/API/permission/compatibility;
- `world-runtime` — chunks, persistence, world mutation/state, ordering and observability;
- `player-experience` — player lifecycle, inventory, interaction/input and feedback;
- `entity-systems` — entity runtime, combat/effects/economy/NPC/mount behavior;
- `arena-gameplay` — arena/round/spatial/state/environment behavior.

## Rules

- Every durable claim keeps provenance, applicability, confidence, and edition/version scope.
- Project policy must stay distinguishable from external/documented facts.
- Unknown or contradictory evidence stays explicit.
- A catalog is evidence input, not runtime proof.
- New catalogs must be assigned to exactly one knowledge group.
- Do not create duplicate policy catalogs for a concept already owned elsewhere.
