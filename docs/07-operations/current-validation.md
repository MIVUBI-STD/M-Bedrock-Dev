# Current Validation

Status: REMOTE STATIC SOURCE + REPRESENTATIVE PRODUCTION PORTFOLIO GREEN; FORMAL BEHAVIOR KERNEL STATIC ONLY; RUNTIME PROOF PENDING

The established repository lanes remain:

```text
Repository Policy
source boundaries
TypeScript
Vitest
source/package verification
```

## Behavioral World Model — 2026-09-27

A new deterministic semantic owner now exists at:

```text
packages/behavior-model/
```

Static contracts cover:

- typed semantic variables and authority labels;
- explicit transition preconditions/effects;
- declared nondeterminism surfaces;
- finite behavior traces;
- ALWAYS / EVENTUALLY / LEADS-TO / UNTIL;
- bounded tick deadlines;
- three-valued `satisfied / violated / unknown` results.

The most important proof rule is fail-closed temporal reasoning:

```text
clean incomplete prefix != proven property
```

A temporal obligation remains `unknown` until it has a positive witness, a valid counterexample/deadline violation, or a complete trace that permits a decision.

This prevents the passive-observation error where no observed counterexample is mistaken for behavioral proof.

## Existing runtime harness status

The source-verified Runtime Lab host remains available but local/live Minecraft execution is intentionally deferred.

Its current supported probe path remains read-only:

- chunk loaded;
- entity resolvable;
- tag present;
- scoreboard value.

No new Minecraft runtime claim is created by the Behavioral World Model work.

## Still unproven

- complete Bedrock behavioral semantics;
- complete Education behavioral semantics;
- engine scheduler/fairness behavior;
- deterministic runtime replay;
- formal happens-before model for engine events;
- AI/pathfinding transition semantics;
- real chunk lifecycle behavior;
- causal hypothesis discrimination;
- real multi-client execution;
- semantic before/after repair equivalence.
