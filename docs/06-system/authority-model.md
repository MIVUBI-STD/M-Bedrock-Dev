# Semantic Authority Model

```text
GAME DESIGN
What should this map/mode do?
        ↓
GAMEPLAY INTENT
What intent can be reconstructed from authored artifact evidence?
        ↓
MINECRAFT PLATFORM KNOWLEDGE
What does the target Minecraft runtime support or do?
        ↓
ENGINEERING CONTRACTS
What global implementation/reliability constraints apply?
        ↓
BEHAVIOR + RUNTIME EVIDENCE
What can happen / what actually happened?
        ↓
DIAGNOSIS
Does observed/derived behavior violate grounded design?
```

Hard boundaries:
- Game Design is explicit and map/mode scoped.
- Gameplay Intent is reconstruction, not independent design authority.
- Platform Knowledge is descriptive and version/runtime scoped.
- Engineering Contracts are normative for implementation quality, not gameplay meaning.
- Behavior Model is an evaluation formalism, not an origin of intended behavior.
- Runtime observations can falsify expectations but do not silently redefine design or platform facts.


Canonical terminology is defined in `canonical-naming.md`.
