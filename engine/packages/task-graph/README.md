# Task Graph

`packages/task-graph` is the repository execution control plane.

It does not own Minecraft semantics, diagnostics, repair policy, or validation semantics. It only decides which registered capabilities are affected by a change and which deterministic work remains necessary.

Core flow:

```text
changed paths / explicit targets
→ directly affected capabilities
→ dependency closure
→ context filter
→ completed/cache reuse
→ deterministic execution order
```

## Rules

- capability ownership stays with the existing package/analyzer/adapter;
- dependencies must be explicit and acyclic;
- affected execution is conservative: an unknown path never silently proves safety;
- cached/completed work may be reused only when the caller has already validated its cache identity;
- Task Graph plans work; it never authorizes repair or upgrades proof strength;
- semantic/runtime evidence remains owned by the existing evidence and validation layers.

This package is intentionally small. Do not move domain logic into it.
