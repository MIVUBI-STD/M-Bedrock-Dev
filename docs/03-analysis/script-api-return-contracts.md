# Script API Return-Contract Intelligence

M-Bedrock-Dev now models versioned return contracts when the same API symbol remains available but the return value becomes less strict.

## Initial rule

`Entity.getComponent` is the first evidence-backed rule.

The official changelog records this transition in `@minecraft/server 1.18.0`:

```text
before 1.18.0:
Entity.getComponent → EntityComponent

1.18.0+:
Entity.getComponent → EntityComponentReturnType<T> | undefined
```

## Observable use shapes

The parser records how a method result is used directly:

- `ignored`;
- `assigned`;
- `returned`;
- `dereferenced`;
- `optional-dereferenced`;
- `non-null-asserted`;
- `other`.

Example:

```ts
entity.getComponent("minecraft:health").currentValue
```

is recorded as:

`dereferenced`

while:

```ts
entity.getComponent("minecraft:health")?.currentValue
```

is:

`optional-dereferenced`

## Diagnostic

For module versions at or after the optional-return transition, direct dereference emits:

`SCRIPT_API_RETURN_CONTRACT_RISK`

with medium severity.

This is a risk diagnostic, not a certainty that the map will fail. A known component may exist at runtime, but the API contract no longer guarantees a non-undefined result.

## Conservative boundary

Assigned or returned values are not chased through arbitrary downstream control flow yet.

For example:

```ts
const health = entity.getComponent("minecraft:health");
if (health) {
  health.currentValue;
}
```

is classified as downstream-flow `unknown`, not unsafe.

Likewise, spread/dynamic patterns and complex alias propagation remain outside this rule.

## Usage inventory

Method usage now retains result-use distributions across individual maps and portfolios.

This makes it possible to compare:

```text
Entity.getComponent
├── dereferenced            21
├── optional-dereferenced    8
└── assigned                12
```

before expanding guarded-flow analysis further.
