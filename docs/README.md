---
id: document.docs.router
class: DOCUMENT
domain: docs
role: ROUTER
authority: CANONICAL
lifecycle: ACTIVE
---

# M-Bedrock-Dev Documentation

Single entry point for human and AI documentation discovery.

> Repository work planning is intentionally separate from documentation. Use `../planning/` for development, operations, and project continuation intent. Use `workspace/` for working artifacts and execution data.

> Documentation domains use semantic names. Directory names describe ownership domains, not workflow order or authority priority.

## Load rule

Resolve the task domain first, then load only the smallest canonical set.

```text
PRODUCT / FLOW            → [product/](./product/README.md)
ARTIFACTS / PACKAGING     → [artifacts/](./artifacts/README.md)
ANALYSIS / GRAPH          → [analysis/](./analysis/README.md)
REPAIR / MUTATION         → [repair/](./repair/README.md)
VALIDATION / EVIDENCE     → [validation/](./validation/README.md)
SYSTEM / OWNERSHIP        → [system/](./system/README.md)
EXAMPLES / REFERENCE      → [examples/](./examples/README.md)
```

Core system documents answer different questions:

```text
What is the complete audit order?  → analysis/master-selected-map-audit-workflow.md
How are checkpoints enforced?       → analysis/mandatory-audit-procedure.md
How is that flow presented?       → product/flow.md
How much should we build?      → system/development-discipline.md
Who owns the implementation?   → system/implementation-map.md
Which specialist procedure?    → system/skill-routing.md
How do we build/test/deliver?  → system/development-operations.md
```

## Documentation domains

```text
docs/
├── product/
├── artifacts/
├── analysis/
├── repair/
├── validation/
├── system/
```

## Documentation loading contract

Documentation is consumed as a routed graph, not as a folder scan:

```text
task / question
→ docs/README.md
→ one domain README
→ one canonical owner
→ Resource Retrieval
→ Section Retrieval when the document is large
→ specialist/source/proof only when activated
→ Context
→ STOP
```

Document roles:

```text
README.md            → router / index
canonical owner      → durable rule or model for one concern
specialist document  → bounded domain detail loaded on demand
source               → implementation/runtime truth
reliability history  → historical evidence only
planning/workspace   → current work/execution state, never docs
```

A document that is not routed by its domain README is invalid. Broad-scanning a domain is a fallback for diagnosis of the documentation system itself, not normal product work.

## Context policy

1. Start here only when the domain is not already known.
2. Read the selected domain owner.
3. Load exactly one specialist when its procedure materially helps.
4. Add another specialist only after semantic ownership changes.
5. Do not add planning/todo/current-state data to docs; use `planning/`, `workspace/`, or reliability history according to ownership.
6. Evidence/history is opt-in; do not broad-scan for reassurance.
7. Git history owns superseded architecture and rationale.

## Authority roles

```text
Docs     = durable semantic policy/contracts
Skills   = bounded execution procedure
Source   = current implementation/runtime truth
Evidence = supporting history/research, opt-in
```

One concern has one canonical semantic owner. Link instead of duplicating.


## Zero-waste execution

For task routing, affected analysis, cache/proof reuse, bounded context, and selective validation, see [system/zero-waste-execution.md](system/zero-waste-execution.md).