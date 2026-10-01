# Skill Contract

Every **work-lane** SKILL.md must use the same control structure:

1. `Purpose`
2. `Entry criteria`
3. `Allowed actions`
4. `Forbidden actions`
5. lane-specific pipeline/procedure
6. `Output contract`
7. `Handoff`
8. `STOP`

Domain specialists may use a smaller procedure, but must declare `Role: DOMAIN SPECIALIST` and a `Lane boundary`.

## Canonical work-lane names

```text
Map Bug Audit
Detection Development
Detection Benchmark
Target Repair
```

**Product Development** is not Detection Development. Generic repository/product feature work uses the normal development execution contract and canonical semantic owner.

## No implicit lane switches

```text
Map Bug Audit
  detection-gap
    → handoff record
    → STOP claim

Detection Development
  implementation complete
    → Detection Benchmark
    → STOP development

Detection Benchmark
  pass/fail
    → report/handoff
    → STOP benchmark
```

A handoff is data, not an instruction to continue automatically.
