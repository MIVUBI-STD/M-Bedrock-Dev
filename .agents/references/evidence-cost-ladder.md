# Evidence Cost Ladder

Use the cheapest tier that can discriminate the claim. Escalate only when the current tier cannot resolve it.

| Tier | Evidence | Typical cost | Examples |
|---|---|---|---|
| E0 | metadata/config identity | lowest | manifest/version/profile/inventory |
| E1 | source/static semantics | low | functions, scripts, commands, graph, Game Design |
| E2 | native/world persisted evidence | medium | LevelDB, structures, actors, chunk state |
| E3 | package/cross-source correlation | medium-high | packaged artifact consistency, native/source reconciliation |
| E4 | controlled local runtime | high | import/run/probe on compatible Minecraft |
| E5 | live multiplayer/production-like runtime | highest | race/interleaving/reconnect/multi-client behavior |

## Rules

- Do not use E4/E5 if E1/E2 already proves the claim.
- A higher tier does not repair weak expected-behavior authority.
- Missing access to a required tier yields `runtime-proof-required`, not a defect.
- Detection Development must state whether a change reduces the evidence tier required for the same claim.
