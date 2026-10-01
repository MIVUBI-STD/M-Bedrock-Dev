# Eval Contract

Evaluate whether Map Bug Audit:
- recovers current Game Design and builds a scoped Gameplay Contract before bug discovery;
- blocks affected scope when material design intent is unresolved;
- triggers for bug finding/retest prompts;
- does not trigger Detection Development merely because a detector limitation appears;
- never mutates engine or target;
- does not severity-rank non-defects;
- prefers the cheapest sufficient evidence tier;
- emits detection-gap when capability is insufficient.

Primary corpora:
- .agents/evals/skill-routing.json
- .agents/evals/skill-procedure.json
