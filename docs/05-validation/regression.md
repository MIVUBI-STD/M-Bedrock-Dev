# Regression Fixtures

Regression fixtures should reduce real defects to the smallest reproducible form.

The first fixture models repeated arena-like fill effects with one translation outlier. Its purpose is to prove the source-level chain:

```text
typed command
→ resolved effect
→ expected translation
→ outlier
→ patch transaction
→ working-copy mutation
→ reparse
→ translation match
```

The fixture is intentionally not a full mcworld. Archive transport is a separate concern.
