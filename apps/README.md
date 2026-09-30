# Apps

Thin user-facing interfaces over the deterministic engine.

```text
apps/
├─ cli/             command-line inspection / engineering interface
└─ bug-report-ui/   Svelte report review/presentation interface
```

Both surfaces consume canonical engine APIs. Neither may own Bedrock parsing, diagnosis, repair policy, or persistent semantic truth.

`ownership.json` is the canonical app-surface registry. New interfaces must be added there and must reuse the same engine rather than creating a parallel implementation.
