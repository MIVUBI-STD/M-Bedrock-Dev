# Logic Solver

Constraint-backed behavioral proof engine for M-Bedrock-Dev.

The solver consumes the existing Behavioral World Model. It does not own Minecraft semantics, gameplay intent, or diagnostic classification.

## v1 questions

The bounded deterministic backend answers:

1. is a state predicate reachable?
2. does an invariant hold for every reachable state?
3. what is the shortest witness/counterexample?
4. was the explored state space complete or truncated?

Breadth-first exploration provides shortest transition traces. State identity is based on semantic values rather than tick so revisiting the same semantic state does not create artificial infinite histories.

## Proof discipline

Results are three-valued:

- `proved`: the claim has a witness, or exhaustive exploration proves an invariant;
- `disproved`: a counterexample exists, or exhaustive exploration proves a reachability target impossible;
- `unknown`: the configured depth/state budget truncated an unexplored successor.

Absence of a counterexample inside a truncated search is never reported as proof.

The package is backend-neutral. A future SAT/SMT backend may implement the same contract without becoming the semantic owner.

## Automatic compilation

The compiler translates evidence-bearing formal model structure into solver work without guessing semantics from variable names.

Currently it compiles:

- every `always` temporal property into an invariant proof query;
- every transition precondition set into an enablement/reachability query.

Unsupported open-ended temporal properties are returned explicitly instead of being weakened into a false bounded proof.

## Temporal proof v2

The temporal verifier explores execution paths and reuses the Behavioral World Model's canonical temporal evaluator for `eventually`, `leads-to`, and `until`.

- finite exhausted path spaces can prove temporal obligations;
- a concrete violating prefix disproves an obligation;
- EVENTUALLY/UNTIL can produce reachable lasso counterexamples when a cycle can repeat forever without discharging the obligation;
- cyclic LEADS-TO remains `unknown` until a monitor-automaton backend can safely reason across loop boundaries;
- budget exhaustion remains `unknown`.
