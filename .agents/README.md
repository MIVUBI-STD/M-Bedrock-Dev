# Agent Skills

M-Bedrock-Dev separates **work lanes** from **domain specialists**.

## Work lanes

```text
m-bedrock-map-bug-audit
m-bedrock-detection-development
m-bedrock-detection-benchmark
m-bedrock-target-repair
```

## Domain specialists

```text
m-bedrock-artifact-engineering
m-bedrock-content-analysis
m-bedrock-compatibility
```

## Routing only

```text
m-bedrock-cross-owner-routing
```

Select exactly one active work lane. Consult the smallest domain specialist only when the lane reaches that semantic owner.

A `detection-gap` is a handoff boundary, not permission to start Detection Development inside an operational audit. Generic Product Development is a separate execution class.

Canonical routing is owned by `../docs/06-system/skill-routing.md`.


## Machine-readable registry

`.agents/skill-registry.json` is the routing index and classification authority.

- registry decides whether a skill is a work lane, domain specialist, or routing-only;
- `SKILL.md` owns the detailed procedure;
- every skill folder must appear exactly once in the registry;
- adding a skill without registry ownership is forbidden.
