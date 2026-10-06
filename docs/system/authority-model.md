---
id: document.system.authority-model
class: DOCUMENT
domain: system
role: CONTRACT
authority: CANONICAL
lifecycle: ACTIVE
---

# Semantic Authority Model

## Current gameplay authority

For a normal map audit:

```text
Selected Map Version
= one current gameplay evidence universe
```

Inside that artifact:

```text
explicit authored gameplay signals
→ Gameplay Contract / expected behavior

executable source + artifact state + runtime observation
→ Actual Behavior

Expected ≠ Actual
→ diagnosis
```

## Not current authority

These are archive/reference only:

- older map versions;
- Development/Source;
- old Bug Reports / QA;
- Technical Docs;
- changelogs;
- other maps;
- external design/reference documents.

They may be used only for an explicitly requested comparison/history task.

## Hard rules

- never mix evidence from different map versions in one current audit;
- do not use stale documents to fill missing gameplay intent;
- missing intent stays unknown;
- runtime observation does not redefine expected behavior;
- external Minecraft knowledge may explain engine capability, but not map-specific gameplay intent;
- canonical terminology is defined in `canonical-naming.md`.

## Platform knowledge authority

Machine-readable Minecraft platform/runtime facts are owned by the engine knowledge layer.

```text
engine/packages/knowledge
→ knowledge contracts, validation, effective-profile selection

engine/knowledge/
→ descriptive platform facts + provenance
```

Platform knowledge does not own Game Design, project engineering policy, current runtime observations, or validation/release state.

Durable platform facts require provenance and bounded applicability such as edition, Minecraft version, format version, experiment state, or Script API module/version.

Analyzers consume knowledge rather than duplicating platform semantics. UNKNOWN is preferable to inventing unsupported behavior.
## Resource authority model

Knowledge architecture never creates a second semantic authority.

```text
canonical repository owner
→ Resource Catalog entry
→ Graph relationships
→ Retrieval candidates
→ Context
```

The direction is one-way. Catalog, Graph, Retrieval, and Context are derived/navigation layers over existing owners.

Authority classes are defined in [Canonical Naming](./canonical-naming.md):

```text
CANONICAL
REFERENCE
HISTORICAL
DERIVED
```

Rules:

- `CANONICAL` may define current meaning/state only for its exact concern.
- `REFERENCE` may support reasoning but cannot replace a canonical owner.
- `HISTORICAL` may increase search pressure but cannot prove a current condition.
- `DERIVED` must be rebuildable and never manually become authority.

### Catalog boundary

The Resource Catalog registers identity and location. It does not copy full source content or redefine ownership.

A catalog entry contains:

```text
resource ID
class
domain
role when applicable
authority
path / owner reference
lifecycle state
```

If catalog metadata disagrees with the canonical owner/source, the Catalog is stale and must be rebuilt or fixed. The Catalog never wins the conflict.

### Graph boundary

Graph edges describe relationships between registered resources. They do not create ownership or proof.

A Graph edge cannot make REFERENCE evidence CANONICAL, make HISTORICAL evidence current, make DERIVED data source truth, authorize mutation, or authorize audit-stage closure.

### Retrieval boundary

Retrieval selects and ranks already registered resources. Ranking score is never authority or proof.

Retrieval must preserve each candidate's resource ID, class, authority, owner/path, applicability when present, and graph relation path when graph-assisted.

### Context boundary

Context is a bounded package assembled for one reasoning/execution need.

Context may contain mixed authority classes, but those classes must remain visible. Context compression may remove redundant wording, not provenance, authority, or proof limits.

## Update authority

When new information affects an existing concept:

```text
existing resource?
├─ yes → update canonical owner
└─ no  → classify/register one new resource
```

Do not solve updates by adding aliases, copies, `-new` resources, or alternate owners.

When a resource moves physically, update its path while retaining its semantic ID.

When a resource is no longer active, retire or remove it from current routing. Do not preserve current-tree duplicates merely for backward naming compatibility unless an explicit external compatibility contract requires them.

## Current-state access boundary

Planning and Workspace remain directly routed current-state owners.

```text
current/future work intent
→ planning/

current project execution state / working artifacts
→ workspace/
```

They are not default Resource Catalog search candidates and must not be mixed into general knowledge Retrieval for reassurance.

When a task explicitly asks for current work, continuation, report state, or project execution data, Router selects the matching Planning/Workspace owner directly. Context may then include that selected state with its ownership intact.

Reliability History is registered in Catalog for searchability but Retrieval excludes HISTORICAL resources by default. Historical resources enter Context only through explicit historical search/opt-in or an explicit historical seed.
