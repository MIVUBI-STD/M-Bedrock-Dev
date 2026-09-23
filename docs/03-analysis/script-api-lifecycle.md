# Script API Lifecycle Intelligence

Lifecycle analysis is version-aware and separated from signature, return-contract, mutability, enum-value, and runtime behavior changes.

## Covered symbols

- methods;
- events;
- receiver properties;
- enum members;
- imported named types;
- bounded namespace-qualified types.

States are `active`, `deprecated`, `removed`, and `unknown`.

Examples include legacy world/entity command methods, world-initialize and item-use-on event surfaces, PlayerInputPermissions legacy properties, lowercase GameMode members, legacy camera option types, and removed signal/component/dimension types.

## Separate lanes

- changed call form → signature matrix;
- optional return → return-contract matrix;
- writable to readonly → property-mutability matrix;
- same enum member with changed string value → enum-value matrix;
- restricted callback operation → execution-privilege matrix.

Dynamic/computed identifiers remain unknown unless their identity can be proven deterministically.
