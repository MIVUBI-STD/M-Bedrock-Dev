# Next Action

## Current lane — Workflow Compression

The repository already has strong semantic analysis, intent reconstruction, evidence discipline, repair safety, runtime-proof contracts, and zero-waste planning. The current priority is to make those capabilities cheaper and easier to use.

### Goal

Create one repository execution control plane that answers:

```text
what changed
→ what capability owns it
→ what depends on it
→ what work is affected
→ what valid work can be reused
→ what still must execute
→ STOP
```

### Current implementation step

`packages/task-graph/` is the new bounded control-plane owner.

It must remain domain-neutral and must not absorb Minecraft semantics from analyzers/packages.

Current acceptance:

- explicit capability dependency graph;
- cycle and missing-owner protection;
- changed-path → directly affected capability resolution;
- reverse dependency closure;
- execution-context filtering;
- cache/completed-work reuse filtering;
- deterministic dependency-ordered plan;
- unmatched paths remain explicit so callers can fail conservative.

### Next integration step

After Task Graph source/tests are stable:

1. register real repository capabilities from existing owners;
2. expose `affected` and `plan` through the existing `DEV.cmd` surface;
3. connect repository verification to affected execution with a conservative full-check fallback;
4. feed the same plan into AI Context Compiler so Codex loads only the required owners/evidence;
5. only then expose the control plane through MCP.

### Non-goals

Do not:

- rename or move the existing architecture yet;
- split `packages/orchestrator` before dependency evidence identifies clean boundaries;
- add another agent hierarchy;
- make AI responsible for deterministic dependency traversal;
- weaken proof levels or runtime gates for speed.

### Success metric

A small source change should produce a small, explainable execution plan. Full verification remains the fallback whenever ownership or dependency coverage is incomplete.
