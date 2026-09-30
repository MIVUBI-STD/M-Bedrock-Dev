# Reliability

Decision layer for blindspot defense and regression planning.

This package does not execute Minecraft and does not own parsers. It consumes facts from canonical analyzers/orchestrators and produces reliability decisions.

## Owners

- Invariant Registry — durable expected properties.
- Regression Corpus model — minimized historical failures.
- Map Compatibility Fingerprint — what a map actually depends on.
- Minecraft Update Delta — what changed between environments.
- Blindspot Coverage — which evidence lanes are known/partial/unknown.
- Retest Planner — which maps/subsystems deserve retesting and through which lanes.

## Core relation

```text
Map Compatibility Fingerprint
× Update Delta
× Historical Regressions
× Coverage Gaps
= Risk-based Retest Plan
```

Priority is rule-derived evidence triage, not a quality score.
