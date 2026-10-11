# Dataflow

Parser-independent value-flow graph and semantic slicing for M-Bedrock-Dev.

This package does **not** parse JavaScript, execute code, or decide Minecraft semantics.

It owns:
- stable data-flow node/edge contracts;
- conservative graph validation;
- forward reachable value flow;
- backward semantic slicing.

Parser-specific extraction belongs to analyzers, initially `engine/analyzers/scripts`.

## Proof discipline

A missing edge is not proof that values cannot flow.

Dynamic property access, reflection, computed calls, unknown aliases, and unsupported JavaScript shapes remain unresolved unless an analyzer can prove the edge.

The graph is evidence for diagnostics; it is not an interpreter.


## Taint propagation

The package can propagate caller-supplied semantic labels over proven flow edges and produce shortest witnesses.

It also runs a generic forward may-reaching-definitions worklist over caller-provided CFG edges and gen/kill/unknown transfer facts. Interpretation of Minecraft state or aliases remains in the Behavior Model, not Dataflow. Opaque paths stay UNKNOWN.

It does not decide which values are sensitive or unsafe. Labels such as `player-identity`, `arena-authority`, `untrusted-command-input`, or `reward-entitlement` must come from the semantic owner consuming the graph.

Barrier nodes are also explicit inputs; Dataflow never invents sanitizers.
