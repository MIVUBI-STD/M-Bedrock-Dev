# M-Bedrock-Dev Documentation

Single entry point for human and AI documentation discovery.

## Load rule

Resolve the task domain first, then load only the smallest canonical set.

```text
PRODUCT / FLOW            → 01-product/
ARTIFACTS / PACKAGING     → 02-artifacts/
ANALYSIS / GRAPH          → 03-analysis/
REPAIR / MUTATION         → 04-repair/
VALIDATION / EVIDENCE     → 05-validation/
SYSTEM / OWNERSHIP        → 06-system/
CURRENT OPERATIONS        → 07-operations/
```

Core system documents answer different questions:

```text
How much should we build?      → 06-system/development-discipline.md
Who owns the implementation?   → 06-system/implementation-map.md
Which specialist procedure?    → 06-system/skill-routing.md
How do we build/test/deliver?  → 06-system/development-operations.md
What happens next?             → 07-operations/next-action.md
What is currently proven?      → 07-operations/current-validation.md
```

## Canonical hierarchy

```text
docs/
├── 01-product/
├── 02-artifacts/
├── 03-analysis/
├── 04-repair/
├── 05-validation/
├── 06-system/
└── 07-operations/
```

## Context policy

1. Start here only when the domain is not already known.
2. Read the selected domain owner.
3. Load exactly one specialist when its procedure materially helps.
4. Add another specialist only after semantic ownership changes.
5. Operations docs are current-state context, not durable design authority.
6. Evidence/history is opt-in; do not broad-scan for reassurance.
7. Git history owns superseded architecture and rationale.

## Authority roles

```text
Docs     = durable semantic policy/contracts
Skills   = bounded execution procedure
Source   = current implementation/runtime truth
Ops docs = current continuation/proof state
Evidence = supporting history/research, opt-in
```

One concern has one canonical semantic owner. Link instead of duplicating.
