# Map Audit Report V2 Schema

## Purpose

Defines the production audit model after Game Design First analysis.

## Required audit model

```text
World Artifact
→ Evidence Scope
→ Game Design Model
→ Gameplay Flow
→ State Transitions
→ Multi Arena / Capacity Model
→ Blind-Spot + Cross-System Coverage
→ Bug Findings
→ Coverage Accounting
→ Production Report
```

## Evidence scope

Current gameplay conclusions must come from the selected artifact only.

The output records:
- selected artifact;
- selected-map-version-only mode;
- archive sources not used as current gameplay authority.

## Game design model

Required understanding:
- objective;
- win condition;
- lose condition;
- reset rules;
- preserve rules;
- progression rules;
- multiplayer rules;
- multi-arena/capacity rules when applicable.

## Coverage accounting

Every applicable audit surface is recorded as:

- checked;
- blocked, with reason; or
- not-applicable, with reason.

Unsupported or unparsed mechanics are reported as Detection Gap.

## Bug record

Every reportable issue requires:

```text
Bug ID
Category
Gameplay Flow
Status
Issue
Player Impact
Reproduction Steps
Expected Behavior
Actual Behavior
Evidence
Proof Ceiling
```

Confirmed bugs additionally require:
- Blocker / Major / Minor severity;
- cleared counter-evidence;
- tester-ready reproduction.

## Status

- Confirmed — contradiction proven from selected artifact.
- Needs Validation — plausible issue requiring additional proof.
- Ambiguous — conflicting or insufficiently grounded gameplay intent.
- Detection Gap — audit capability cannot safely evaluate the surface.
