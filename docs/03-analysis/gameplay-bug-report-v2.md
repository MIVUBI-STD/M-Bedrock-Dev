# Gameplay Bug Report V2

## Purpose

Canonical production-facing bug report contract for Minecraft map audits. Reports follow player gameplay flow, not implementation discovery order.

This file owns report semantics. Rendering details belong in `templates/bug-report-v2-html-layout.md`. Machine validation belongs in `.agents/schemas/map-audit-output-v2.schema.json`.

## Document order

```text
01 Overview
02 Gameplay Flow
03 Game Design Reference
04 Bug Dashboard
05 Confirmed Bugs
06 Needs Validation
07 Ambiguous
08 Detection Gaps
09 Reproduction Guide
10 Audit Coverage
```

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

## Status

- Confirmed — contradiction proven from selected artifact.
- Needs Validation — plausible issue needing additional proof.
- Ambiguous — gameplay intent cannot be resolved safely from selected artifact.
- Detection Gap — analyzer cannot safely evaluate the surface.

Designed/normal behavior is not published as a bug.

## Audit coverage

The report must expose coverage accounting. Each applicable surface is:

- checked;
- blocked, with reason; or
- not-applicable, with reason.

A clean happy path does not make the report complete.

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
