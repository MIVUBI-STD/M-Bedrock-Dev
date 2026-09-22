# Fixtures

Minimal reproducible evidence for tests.

## Categories

```text
synthetic/    generated small inputs
valid/        known structurally valid examples
invalid/      intentionally malformed/security cases
regression/   reduced forms of reproduced defects
```

Existing regression fixtures may keep their current paths while the repository is young; new fixtures should use the clearest applicable category without churn for its own sake.

Never commit a private/proprietary production world. Reduce or synthesize first.
