# Eval Contract

Evaluate whether Detection Development:
- triggers for false-positive/false-negative/detection-gap prompts;
- does not trigger for generic Product Development;
- changes engine but not target artifacts;
- fixes the first missing reusable owner;
- avoids seed-specific logic;
- freezes expectations before benchmark output;
- hands off to Detection Benchmark rather than declaring success from implementation alone.

## Discovery decision scenarios

- A selected artifact contains a material gameplay mechanic not represented by current semantics: the skill identifies the first missing owner rather than declaring Discovery complete from indexed files alone.
- An unresolved operation has a relevant existing evidence path: the skill searches that path before accepting UNKNOWN; if inaccessible, it names the precise blockage.
- A positive ownership example and a same-name/different-owner counterexample produce different decisions, not unconditional isolated or unconditional UNKNOWN.
- Arena instance count differs from requested/safe concurrency: the skill keeps all three meanings separate through consumers.
- SourceRef matches artifact/file but not a proving statement: the skill does not treat location as semantic proof.
- The source fix changes one layer but its consumer still reports COMPLETE incorrectly: the skill requires end-to-end propagation and regression acceptance before completion.
- Static verification without test execution is reported as source-verified only; CI remains optional, not a mandatory development gate.
