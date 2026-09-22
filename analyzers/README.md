# Analyzers

Read-only semantic derivation from Bedrock/Education content.

## Owners

```text
discovery/     physical/path/content classification
manifest/      manifest normalization
functions/     function parsing and references
commands/      typed command effects
references/    target resolution
diagnostics/   diagnostic derivation
topology/      coordinate/state/repeated-pattern analysis
```

Analyzers preserve source evidence and never directly mutate artifacts.

Version-dependent behavior must route through compatibility/rule authority instead of being silently hardcoded across analyzers.
