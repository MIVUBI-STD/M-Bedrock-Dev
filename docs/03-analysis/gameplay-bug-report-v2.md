# Gameplay Bug Report V2

## Purpose

Canonical production-facing bug report contract for Minecraft map audits. Reports follow player gameplay flow, not implementation discovery order.

This file owns report semantics. Rendering details belong in `templates/bug-report-v2-html-layout.md`. Machine validation belongs in `.agents/schemas/map-audit-output-v2.schema.json`.

## Document order

Canonical Bug Report V2 contains only approved confirmed bugs.

```text
01 Overview
02 Bug Dashboard
03 Confirmed Bugs
04 Tester / Reproduction Checklist
05 Technical Detail when applicable
06 Report Scope / Version
```

Needs Validation, Ambiguous, and Detection Gap items belong to Map Audit Output V2 and Proposed Bug Set discussion. They must not be persisted into canonical Bug Report V2 or client HTML as confirmed bugs.

## Overview

Record:

- World
- Version
- selected artifact
- audit mode: selected-map-version-only
- proof ceiling

## Bug record

Every reportable issue uses:

```text
Bug ID
Category
Gameplay Flow
Status
Severity (Confirmed only)
Issue
Player Impact
How To Reproduce
Expected Behavior
Actual Behavior
Evidence
Proof Ceiling
```

Confirmed bugs additionally require:

- cleared counter-evidence;
- tester-ready reproduction;
- Blocker, Major, or Minor severity.

## Status boundary

Canonical Bug Report V2 contains approved confirmed defects only.

Before approval:

- Confirmed — contradiction proven from selected artifact and eligible for Proposed Bug Set review.
- Needs Validation — remains in Map Audit Output / verification planning.
- Ambiguous — remains in Map Audit Output / discussion.
- Detection Gap — remains in Map Audit Output / Detection Development handoff.

Designed/normal behavior and unresolved findings are not published as canonical bugs.

## Audit coverage boundary

Full coverage accounting belongs to Map Audit Output V2.

Canonical Bug Report V2 may summarize report scope/version, but it must not become a second audit-coverage database.

A comprehensive Bug Report may be published only after the upstream Discovery Closure and Gameplay Model Closure publication gates pass.

## Language rule

Tester reproduction uses player-facing terms such as:

- World
- Player
- Level
- Wave
- Arena
- Enemy

Implementation details remain in Evidence, not reproduction steps.

## Ordering rule

Findings are ordered by gameplay journey. Technical discovery order must not determine report order.


## Complex finding depth

Simple bugs remain concise.

When a finding materially depends on shared resources, platform limits, replica divergence, prerequisite reachability, authorization, persistence, or cross-system timing, Technical Analysis should include the relevant subset of:

```text
Root Cause
Design Contradiction
Evidence Convergence
Quantitative / Platform Constraints
Prerequisite Reachability
Authorization / Capability Exposure
Repair Directions
Verification Scenario
```

Reachability gaps must be reported as unresolved evidence rather than converted into claims that a prerequisite is unreachable.

## Publication gate

Both preconditions apply:

- Gameplay Discovery Closure `OPEN` blocks comprehensive proposed review and final publication because the surface inventory is not stable.
- Gameplay Model Closure `OPEN` blocks comprehensive proposed review and final publication because discovered gameplay is not sufficiently understood.

A partial bug list must not be presented as the completed audit.
