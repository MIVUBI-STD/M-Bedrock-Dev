# Gameplay Intent

This package owns the parser-independent semantic model for what an authored Minecraft experience is trying to do.

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

The model is evidence-backed and intentionally separates authored intent, inferred intent, open hypotheses, and unresolved unknowns.

It does not mutate artifacts and it does not decide root cause. Its job is to reconstruct enough game meaning that downstream diagnostics do not mistake designed behavior for a defect.

## Core representation

The Gameplay Intent Graph contains typed nodes for concepts such as game, mechanic, actor, role, objective, phase, state, resource, lifecycle, spatial region, policy, and outcome.

Typed edges express ownership, participation, production/consumption, state transitions, scope, reset, persistence, recovery, requirements, and win/loss relationships.

Every material node, edge, and invariant can bind to evidence. Unknowns are first-class and may explicitly block diagnosis for affected subjects.

## Safety rule

A downstream defect conclusion must not be stronger than the intent evidence that supports the expected behavior.

Authored intent contradicted by observed evidence can support a confirmed defect classification. Inferred intent can support only a probable defect until stronger evidence is obtained. Unresolved intent ambiguity blocks defect classification.
