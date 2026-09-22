# Architecture

## Dependency direction

```text
apps / future interfaces
        ↓
canonical packages
        ↓
adapters / analyzers / rules / schemas
```

Interfaces must not become owners of Bedrock semantics.

## Planned canonical modules

```text
packages/artifact         artifact identity, fingerprints, immutable source boundary
packages/archive          safe container extraction/repack primitives
packages/project-model    normalized content model
packages/graph            semantic references and dependency graph
packages/diagnostics      typed findings and diagnostic contracts
packages/repair           patch plan + transactional mutations
packages/validation       static/package/runtime evidence contracts
packages/compatibility    edition/version capability profiles
packages/report           machine + human-readable reporting
packages/common           truly shared low-level primitives only
```

## Format adapters

Adapters translate source formats into canonical representations and back. They do not own policy.

Initial adapter lanes:

```text
mcworld
mcpack
mcaddon
behavior-pack
resource-pack
leveldb
structure
```

## Analyzer lanes

Analyzers derive semantic facts and findings without mutating source:

```text
manifests
functions / commands
scripting
entities
structures
references
multiplayer / arena
world
```

## Anti-patterns

Do not introduce:

- one giant Bedrock manager;
- MCP-only business logic;
- duplicate file/reference registries;
- analyzer-side mutation;
- scattered edition/version checks;
- silent source overwrite;
- repair logic that cannot describe its affected scope;
- broad compatibility fallbacks without evidence.
