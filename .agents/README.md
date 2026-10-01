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

A `capability-gap` is a handoff boundary, not permission to start Detection Development inside an operational audit. Generic Product Development is a separate execution class.

Canonical routing is owned by `../docs/06-system/skill-routing.md`.
