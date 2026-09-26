# Minecraft Bedrock / Education Knowledge Base

This directory contains repo-owned, machine-readable domain knowledge.

It is separate from:

- analyzers: interpret project content;
- compatibility: evaluate target compatibility;
- runtime-profile: identifies the exact target product/host/module/environment;
- reliability: plans proof/search/retest;
- repair: mutates a working copy.

Knowledge answers:

> What documented, observed, derived, project-owned, or still-unknown Minecraft behavior is relevant to interpreting this exact target?

## Epistemic rule

Knowledge is not an authority ladder where one source silently overrides another.

Official documentation describes a contract or documented behavior.
Runtime observations describe what a specific runtime actually did.
Controlled experiments describe reproducible behavior under declared conditions.
Project policy describes intended MIVUBI behavior.

When these disagree, the disagreement is evidence. It must remain visible as a version/environment discrepancy or unresolved contradiction.

## Legacy catalog classification

Schema v1 remains supported during migration:

- `engine-fact`
- `derived-rule`
- `project-policy`
- `open-assumption`

New knowledge should move toward schema v2 claims with:

- typed subject / predicate / object;
- explicit runtime applicability;
- immutable source revisions;
- evidence appropriate to the claim class;
- lifecycle and certainty state;
- contradictions and falsifiers.

## Runtime identity

A claim must not assume that all Bedrock-engine environments are equivalent.

The v2 runtime profile distinguishes at least:

- Bedrock Retail;
- Bedrock Preview;
- Minecraft Education;
- client/listen-server;
- Bedrock Dedicated Server;
- Realms;
- Education host;
- Editor;
- Minecraft product version;
- Script API module versions and tracks;
- experiments;
- world settings and inventory completeness.

Absence from an incomplete inventory is **UNKNOWN**, not false.

## Design principle

The knowledge system distinguishes:

```text
documented contract
observed implementation
derived rule
project policy
hypothesis
```

and independently:

```text
request
queued work
applied state
verified state
committed gameplay state
```

Observed runtime behavior is not automatically causal proof.

## Coverage status

Do **not** describe the general Bedrock/Education runtime as broadly covered.

Current knowledge is a partial corpus with uneven depth. Coverage must be reported by capability and proof lane, for example:

```text
domain
→ static representation
→ semantic model
→ runtime observation
→ differential proof
→ target-edition proof
```

Missing proof is represented explicitly as partial or unknown.

New knowledge may be triggered by:

- a concrete map mechanic not represented here;
- a new Minecraft/Education version or Script API surface;
- a newly observed runtime failure;
- a controlled runtime experiment;
- a contradiction between documentation and runtime;
- a specialized content family.

## Migration

Schema v1 catalogs remain readable while v2 claims and runtime-profile contracts are introduced.

Do not bulk-convert v1 facts mechanically. Promotion to v2 should preserve provenance, target scope, uncertainty, and contradictions rather than merely changing JSON shape.
