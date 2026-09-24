# Fixtures

Minimal reproducible evidence for tests.

## Categories

```text
synthetic/    generated small inputs
valid/        known structurally valid examples
invalid/      intentionally malformed/security cases
regressions/  reduced forms of reproduced defects
```

`fixtures/regressions/` is the single canonical regression-fixture owner. Do not create a parallel singular `fixtures/regression/` tree.

Never commit a private/proprietary production world. Reduce or synthesize first.
