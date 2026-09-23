# Structure Placement and Command-Chain Semantics

The structure analyzer now separates two proof levels.

## Local command-chain topology

This is derived directly from command-block palette state and local structure coordinates.

The analyzer reads:

- `facing_direction`;
- `conditional_bit`;
- command-block variant;
- local command-block coordinate.

Known Bedrock facing values are treated as:

- 0 down;
- 1 up;
- 2 north;
- 3 south;
- 4 west;
- 5 east.

The command block's facing direction identifies the next local coordinate that can continue a chain.

Strong static issue:

```text
conditional chain block
+ no detected predecessor
→ chain topology risk
```

## Placement transform

Absolute structure loads can derive candidate world coordinates for embedded command blocks.

The transform model applies structure mirror then 90-degree rotation around the local structure origin before adding the load origin.

Because official structure documentation describes rotation/mirror/pivot semantics but does not specify every transformation-order edge case, world-space output is labeled:

```text
confidence = inferred-transform
```

and is not used as standalone proof of a runtime failure.
