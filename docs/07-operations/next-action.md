# Next Action

The current remote-static compatibility architecture is complete and now validated against a representative production portfolio.

Production proof:

```text
2 production mcworld artifacts
570 Script API occurrences
82 unique symbols
82 known
0 unclassified
0 promotion candidates
0 unknown singleton-root symbols
0 unresolved references
```

Do not add another generalized static subsystem without new evidence.

Next work should follow one of these lanes:

1. **Map repair** — act on real findings already surfaced by production analysis, such as deprecated Script API use, optional `getComponent` return risks, or restricted-execution calls.
2. **Runtime proof** — import/load the map in the target Minecraft build and validate entity AI, timing, chunks, saved ticks, and multiplayer interleavings.
3. **Update differential** — run `compare-update` on real before/after Minecraft-update artifacts.
4. **Knowledge expansion** — only when a real map exposes an unclassified symbol or Microsoft publishes a new documented API transition.
5. **Entity-event proof** — supply runtime or additional content evidence for events that remain informationally unreachable from internal/engine/project trigger roots.

Remote static work is not the current bottleneck. Production/runtime evidence is.
