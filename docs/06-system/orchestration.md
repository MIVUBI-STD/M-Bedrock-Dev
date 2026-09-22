# Project Orchestration

The first orchestration path is deliberately small:

```text
artifact fingerprint
→ archive inventory
→ archive safety validation
→ extract source
→ copy to working
→ filesystem inventory
→ pack discovery
→ manifest analysis
→ function/structure nodes
→ reference graph
→ diagnostics
```

The orchestrator composes owners. It must not duplicate parsing, graph, diagnostics or archive policy.

The initial CLI is a thin consumer of this path and prints machine-readable JSON.
