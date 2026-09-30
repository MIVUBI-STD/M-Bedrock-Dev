# Script Analyzer

Static analysis for Bedrock Script API source.

The analyzer uses the TypeScript compiler parser for JavaScript/TypeScript syntax and never executes artifact code.

Current facts:

- imports and imported bindings;
- @minecraft/* module usage;
- relative module dependencies;
- world/system access;
- beforeEvents/afterEvents subscriptions;
- system.afterEvents.scriptEventReceive usage;
- dynamic property calls and literal property IDs when statically knowable.

Unknown/computed behavior remains unknown rather than being evaluated.

This analyzer does not attempt arbitrary data-flow execution, bundling, type-checking against Minecraft declarations, or JavaScript evaluation.
