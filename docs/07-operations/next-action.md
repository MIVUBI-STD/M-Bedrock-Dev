# Next Action

Remote static analysis is complete for the current representative production portfolio.

Final production proof:

```text
2 production mcworld artifacts
570 Script API occurrences
82 unique symbols
82 known
0 unclassified
0 promotion candidates
0 unknown singleton-root symbols
0 unresolved references
0 known analyzer false-positive findings in the repaired precision cases
```

Do not add another generalized static subsystem without new evidence.

Next work should use one of these lanes:

1. **Runtime proof** — import/load the maps in the target Minecraft build and validate entity AI, event timing, chunks, saved ticks, and multiplayer behavior.
2. **Controlled API migration** — migrate the four genuine Defense V2 1.x deprecations only together with an explicit target `@minecraft/server` upgrade and runtime validation.
3. **Update differential** — run `compare-update` on real before/after Minecraft-update artifacts.
4. **Entity-event proof** — add runtime/project evidence for informational event-reachability gaps when a reported bug points at those events.
5. **Knowledge expansion** — only when production usage or a new official API change exposes a new unclassified surface.

The current bottleneck is Minecraft runtime evidence, not static source intelligence.
