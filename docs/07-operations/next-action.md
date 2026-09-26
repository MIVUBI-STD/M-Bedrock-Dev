# Next Action

M-Bedrock-Dev is now migrating from source-centric reasoning toward an evidence-bounded Minecraft Semantic IR.

## Completed foundations

- exact runtime-profile v2 and tri-state applicability;
- evidence-backed knowledge-claim v2 contracts;
- causal proof ladder where observation is not causation;
- causal/intervention repair gates;
- evidence sufficiency and target-profile binding;
- initial parser-independent Semantic IR contracts for execution, state, and temporal semantics.

## Current lane — Semantic IR integration

1. **Execution IR** — normalize script modules/functions/callbacks, event dispatch, deferred schedulers, and mcfunction call flow.
2. **State IR** — normalize scoreboard, tag, and dynamic-property reads/writes and bind explicit state-authority contracts.
3. **Temporal IR** — classify synchronous, event-dispatch, deferred, and periodic relations without inventing undocumented tick guarantees.
4. **Decision-basis binding** — Semantic IR revision is part of exact decision context so semantic reinterpretation can invalidate stale repair reasoning.
5. **Next integration** — consume Semantic IR in first-wrong-transition and causal probe planning rather than adding more string-level heuristics.

## Explicit limits

The initial Semantic IR is intentionally partial.

It does not yet claim complete semantics for:

- arbitrary JavaScript control/data flow;
- all Script API state methods;
- implicit player/entity/arena scope inference;
- entity AI/navigation;
- spatial/chunk execution;
- undocumented Minecraft scheduler ordering.

Unresolved targets and incomplete scope remain explicit unknowns.

## Safety

- semantic graph and Semantic IR remain separate authorities;
- analyzers produce observations; Semantic IR normalizes them;
- Semantic IR never mutates artifacts;
- unresolved execution targets are retained rather than guessed;
- deferred callbacks retain generation-guard evidence;
- repair authorization must not infer causation from IR topology alone.

The next highest-value work is to connect first-wrong-transition and diagnostic probe planning to the new IR so probes target the earliest unresolved semantic boundary.
