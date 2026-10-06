---
id: document.system.development-discipline
class: DOCUMENT
domain: system
role: CONTRACT
authority: CANONICAL
lifecycle: ACTIVE
---

# Development Discipline

## Minimum complete change

Default order:

```text
No change required?
→ delete unnecessary path?
→ reuse current owner/path?
→ use native/existing dependency?
→ smallest complete addition
→ new abstraction/system only after repeated responsibility is proven
```

Quality is not measured by code volume, abstraction count, tool count, or architectural novelty.

## Evidence gate

For non-trivial mutation:

```text
symptom/requested outcome
→ current evidence
→ failure classification
→ first wrong owner
→ smallest complete change
→ matching proof
→ STOP
```

`UNKNOWN` is valid only when the next separating evidence is named.

## Ownership rules

- one responsibility → one canonical owner;
- one persisted fact → one authority;
- one behavior → one primary execution path;
- adapters are adapters, not semantic managers;
- interfaces present/orchestrate, not duplicate core truth;
- derived caches are rebuildable;
- compatibility fallbacks require evidence;
- generic registries/managers are not default architecture.

## New abstraction gate

Create a new abstraction only when at least one is true:

1. a repeated responsibility already exists in multiple real owners;
2. a trust/security boundary requires isolation;
3. a stable external protocol/format boundary requires adaptation;
4. measurable hot-path performance requires a specialized representation.

Do not create abstractions for hypothetical reuse.

## Efficiency

Optimize cost to accepted result, not static line count.

Prefer:

- incremental indexing;
- change-scoped invalidation;
- content-addressed identity;
- selective parsing;
- bounded evidence;
- typed transformations;
- deterministic fixtures.

Do not sacrifice validation, recoverability, security, data-loss prevention, or explicit user requirements merely to reduce code.

## User-value gate

Before adding a new subsystem, proof layer, registry, workflow state, dashboard, or candidate family, answer:

```text
Which real repeated failure does this remove?
Why can the current owner not solve it?
What user-visible result improves?
How will we know it helped?
```

If those answers are not grounded in repeated evidence, do not add the abstraction.

For M-Bedrock bug finding, discovery breadth and correct classification take priority over additional repair/report infrastructure until real-map evidence proves otherwise.