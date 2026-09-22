# Contributing

Development targets the `Local` branch.

## Before changing code

- Read `AGENTS.md`.
- Identify the canonical owner.
- Keep the change within one responsibility when possible.
- Prefer removal or reuse over a new abstraction.
- Define how the change will be verified before implementing it.

## Expected checks

The initial project will converge on:

```text
format
lint
typecheck
unit
schema
fixture
roundtrip
regression
```

Not every check exists during bootstrap. `docs/07-operations/current-validation.md` records what is actually available.

## Fixtures

Fixtures must be minimal, explain what they prove, and avoid unnecessary redistribution of third-party content. Real-world bugs should be reduced to the smallest reproducible fixture when possible.
