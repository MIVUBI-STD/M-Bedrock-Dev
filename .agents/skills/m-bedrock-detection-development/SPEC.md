# Detection Development Specification

## Intent
Improve reusable detector correctness, semantic coverage, or proof strength from a bounded detection gap/regression.

## In scope
- adapters/parsers/analyzers;
- Platform Knowledge / Rules;
- design grounding / Behavior Contracts;
- diagnostic inference;
- proof/runtime-harness capability;
- reduced fixtures and frozen expectations.

## Out of scope
- production-map repair;
- unrelated product features;
- seed-specific hardcoding.

## Acceptance
- first missing owner is identified;
- generalized acceptance is stated before implementation;
- reduced fixture or stable expectation exists;
- false-positive boundary is represented where material;
- benchmark handoff is explicit.

## Quality objective
Optimize detector quality, not raw finding count. Precision, recall, proof strength, evidence cost, and runtime/context cost are all valid quality dimensions.
