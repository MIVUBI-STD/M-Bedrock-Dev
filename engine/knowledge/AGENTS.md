# Knowledge Agent Rules

Applies to machine-readable Bedrock / Education knowledge under `engine/knowledge/`.

## Routing

Select the smallest domain group from `ownership.json` before reading catalogs:

- `platform` — edition, compatibility, permission, Script API and platform capabilities;
- `world-engine` — chunks, structure, command context, persistence, automation, event ordering and world state;
- `player-runtime` — player lifecycle, inventory, input, interaction, teleport and feedback;
- `entity-runtime` — entity lifecycle, combat, effects, economy, NPC, mounts and physics;
- `gameplay-runtime` — arena cleanup, rounds, cinematic control, hazards, spatial containment and shared state.

## Rules

- Every durable claim keeps provenance, applicability, confidence, and edition/version scope.
- Project policy must stay distinguishable from external/documented facts.
- Unknown or contradictory evidence stays explicit.
- A catalog is evidence input, not runtime proof.
- New catalogs must be assigned to exactly one knowledge group.
- Do not create duplicate policy catalogs for a concept already owned elsewhere.
