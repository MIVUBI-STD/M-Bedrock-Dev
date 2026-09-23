# Entity State Analysis

Entity JSON is now parsed into explicit possible-state candidates before knowledge checks run.

## Parsed model

The entity analyzer extracts:

- description identifier;
- runtime_identifier;
- format_version;
- base components;
- component groups;
- event add/remove mutations;
- nested event triggers.

## State candidates

The initial conservative graph builds:

- base state;
- each individual component-group state;
- each event-added multi-group state.

Unrelated component groups are not merged automatically.

This prevents a common false-negative pattern where one group appears to satisfy the prerequisites of an unrelated group even though both are never active together.

## Knowledge evaluation

`analyzeEntityWithKnowledge()` evaluates each state candidate against the effective Bedrock/Education knowledge profile.

A finding includes the exact state/group/event context where the documented prerequisite is missing.

## Current boundary

This is possible-state analysis, not exact runtime state reconstruction.

Randomize/sequence/filter semantics and event timing are parsed conservatively. Runtime evidence remains necessary to prove which state was active during a real gameplay failure.
