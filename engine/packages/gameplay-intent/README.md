# Gameplay Intent

This package owns the parser-independent **reconstruction model** for what an authored Minecraft experience appears to be trying to do.

It sits between low-level source semantics and defect diagnosis:

```text
semantic graph + Semantic IR
        ↓
Gameplay Intent Model
        ↓
Behavioral World Model
        ↓
Diagnostic Reasoning
```

The model is evidence-backed and intentionally separates authored intent, inferred intent, open hypotheses, and unresolved unknowns. Explicit Game Design is a stronger upstream authority and is represented with `game-design-spec` evidence.

It does not mutate artifacts and it does not decide root cause. Its job is to reconstruct enough game meaning that downstream diagnostics do not mistake designed behavior for a defect.

## Core representation

The Gameplay Intent Graph contains typed nodes for concepts such as game, mechanic, actor, role, objective, phase, state, resource, lifecycle, spatial region, policy, and outcome.

Typed edges express ownership, participation, production/consumption, state transitions, scope, reset, persistence, recovery, requirements, and win/loss relationships.

Every material node, edge, and invariant can bind to evidence. Unknowns are first-class and may explicitly block diagnosis for affected subjects.

## Authority boundary

Gameplay Intent is not the canonical Game Design owner. Minecraft documentation and generic engineering contracts may inform interpretation, but they do not independently create gameplay requirements.

## Safety rule

A downstream defect conclusion must not be stronger than the intent evidence that supports the expected behavior.

Authored intent can support a confirmed defect only when its gameplay authority is independent of the current implementation. Inferred intent and source-only authored intent remain ambiguous until stronger design authority exists. Unresolved intent ambiguity blocks defect classification.


## Authority resolution

Gameplay intent and actual behavior use separate authority domains.

- intended gameplay: current user decision → approved Game Design → current gameplay documentation → derived intent;
- actual behavior: current runtime observation → current root artifact → current source → derived static behavior;
- release identity: explicitly selected artifact → current root artifact → manifest → changelog.

Historical evidence is a regression/design-evolution hint only. It never becomes current authority by itself.

Authority is resolved per exact scope. A rule for retry does not silently apply to next-tier or new-session behavior. Equally authoritative current claims with different values remain ambiguous instead of being guessed.

Current implementation can describe actual behavior, but source code alone does not independently prove intended gameplay.

## Scoped Gameplay Contract

`buildGameplayContract()` is the canonical bridge from approved design understanding into gameplay audit.

The contract is:

- scoped to the subjects currently being audited;
- derived from the Gameplay Intent Model plus authoritative Game Design evidence;
- explicit about design readiness;
- temporary and rebuildable;
- never a second persisted Game Design authority.

Readiness is fail-closed:

```text
authoritative design missing → BLOCKED
material scoped unknown       → BLOCKED
non-material scoped unknown   → PARTIAL
grounded material rules       → READY
```

Candidate discovery consumes a scoped Gameplay Contract. It must not accept a generic source-derived intent model as sufficient design authority.
