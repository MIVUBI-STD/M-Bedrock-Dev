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
