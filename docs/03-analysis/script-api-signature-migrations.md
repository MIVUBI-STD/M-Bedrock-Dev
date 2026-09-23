# Script API Signature Migration Intelligence

M-Bedrock-Dev now models evidence-backed call-shape changes for Script API methods whose symbol survives across module versions.

This is distinct from lifecycle analysis:

```text
removed symbol      → lifecycle intelligence
same symbol,
different call form → signature intelligence
```

## Observed call shape

For inferred method calls the parser records:

- exact argument count;
- coarse argument kinds;
- whether a spread argument is present;
- source location;
- canonical receiver symbol.

Argument kinds are intentionally shallow:

```text
number
string
boolean
object
array
identifier
call
property
function
null
spread
other
```

This avoids introducing a general TypeScript type checker.

## Initial signature rules

### Entity.applyKnockback

Prior 1.x shape:

```text
applyKnockback(
  directionX: number,
  directionZ: number,
  horizontalStrength: number,
  verticalStrength: number
)
```

2.0.0+ shape:

```text
applyKnockback(
  horizontalForce: VectorXZ,
  verticalStrength: number
)
```

The rule therefore treats a fixed four-argument call as compatible with the 1.x shape and incompatible with 2.0.0+, while the two-argument vector form is compatible with the 2.x shape.

### Dimension.spawnEntity

Prior 1.x shape:

```text
spawnEntity(identifier, location)
```

2.0.0+ shape:

```text
spawnEntity(identifier, location, options?)
```

A three-argument call is therefore incompatible with a 1.x manifest and valid on the 2.x signature line.

## Diagnostic

A deterministic mismatch emits:

`SCRIPT_API_SIGNATURE_INCOMPATIBLE`

The finding records:

- exact method symbol;
- declared module version/track;
- transition version;
- expected pre/post transition phase;
- expected minimum/maximum argument count;
- observed argument count and coarse kinds;
- whether spread arguments are present;
- evidence rule id.

Spread arguments are not guessed. They resolve to unknown signature compatibility.

## Real-map inventory

Method inventory now retains call-shape distributions.

For a method used in multiple forms, the portfolio can expose data such as:

```text
Entity.applyKnockback
├── 4 args: number,number,number,number → 14 occurrences
└── 2 args: object,number               → 3 occurrences
```

This lets production-map analysis measure migration exposure before adding more signature rules.

## Boundary

Current signature analysis handles deterministic argument-shape transitions only.

Still separate:

- return-type migrations;
- changed object-property contracts inside options objects;
- generic/type-parameter migrations;
- overload resolution;
- semantic changes with identical syntax;
- computed/spread argument inference beyond safe arity analysis.
