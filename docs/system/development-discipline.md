---
id: document.system.development-discipline
class: DOCUMENT
domain: system
role: CONTRACT
authority: CANONICAL
lifecycle: ACTIVE
---

# Development Discipline

## Development Operating Standard (DOS v1)

This is the mandatory behavior contract for every `SYSTEM DEVELOPMENT` task, including Product Development and Detection Development. Before material edits, the selected development skill must apply DOS; citing this document without following its decisions is not compliance. Do not create a second workflow or status owner.

1. **Normalize intent.** Translate informal or disordered user prompts into a bounded goal, observable acceptance, known constraints, non-goals and current mode. Clearly distinguish explicit user requirements from agent interpretation. Ask only when materially different implementations cannot safely be resolved from current context.
2. **Pin and understand context.** Read current `Local` source and nearest owner-specific rules before proposing a fix. Trace the affected consumer and existing design; historical notes are not implementation authority.
3. **Ground claims.** Separate observed source facts, inference, hypothesis and genuinely unresolved evidence. Exhaust relevant accessible evidence before declaring UNKNOWN; never invent API behavior, tests, or Minecraft runtime results. Stronger claims require stronger proof.
4. **Choose minimum complete solution.** Evaluate no change → remove obsolete code → correct existing owner → reuse → minimal extension → new component only when justified by existing architectural gates. Do not manufacture managers, registries, compatibility layers or parallel execution paths.
5. **Zero waste and modularity.** Every added file, interface, branch, artifact and test must have a real purpose and consumer. Prevent dead code, stale references and duplicated semantic ownership. Keep modules aligned to one responsibility; do not split files just to appear modular.
6. **Naming and hierarchy.** Reuse canonical vocabulary and established paths. Name components for responsibility and behavior, not vague labels (`Smart`, `Universal`, `V2`) or cosmetic novelty. Preserve public IDs where renaming would break consumers unless a migration is authorized.
7. **Execute autonomously within scope.** Finish coherent, bounded units without asking permission for every internal step. Never silently switch mode, modify target artifacts or extend into adjacent features. Group related corrections by root cause, not one speculative patch per symptom.
8. **Verify proportional to risk.** Check relevant positive and negative cases, downstream consumers, compatibility, and stale impact. Prefer static and targeted checks; CI is manual-only, last resort. A commit or added test is not an executed PASS.
9. **Complete and stop.** Report actual changed owners, verified outcome and proof ceiling, unverified residue, and confirmed commit. Stop once acceptance is met; do not create a new backlog or continue refactoring merely because more could be done.

**Development preflight:** before editing, be able to answer: What did the user ask? What is inferred? Which owner and consumer are affected? What is the smallest safe change? What evidence would falsify success? What is the STOP condition? If essential facts remain unresolved, investigate or ask one decisive question rather than implementing a guess.

**Development completion review:** verify no unauthorized scope drift, unconsumed artifacts, duplicated owner, unsupported proof claim, stale reference introduced or necessary affected test omitted. A missing proof must be reported precisely rather than hidden or converted into an invented passing status.

## SYSTEM DEVELOPMENT execution contract

SYSTEM DEVELOPMENT changes Lazy-Developer itself. It uses the existing Product Development contract, or the existing Detection Development lane when the explicit goal is reusable bug-detection improvement. It never silently becomes MAP BUG AUDIT, Detection Benchmark, or Target Repair.

For a material change follow one bounded sequence:

1. **DEFINE** — state the requested outcome, success metric, scope, non-goals, proof ceiling, and STOP condition.
2. **INVESTIGATE** — pin the current `Local` source, identify the first wrong canonical owner, and distinguish observed failure from inference.
3. **DESIGN** — reuse/remove an existing owner or behavior before introducing new abstraction; select the smallest change that achieves the outcome.
4. **IMPLEMENT** — modify only affected owners and matching tests/contracts. Keep target map originals immutable.
5. **VERIFY** — check the changed claim with the cheapest decisive evidence available, including affected regressions. Source review is not executable/runtime proof; unresolved claims remain explicit.
6. **COMMIT & STOP** — publish one valid logical outcome with the repository's commit continuity metadata, confirm the new `Local` HEAD, then stop when the agreed outcome is met.

Do not make each step a separate persisted workflow stage or commit. If work exceeds one bounded unit, commit independently valid outcomes with their remaining proof and next action. An unqualified "continue" retains the current mode and scope.

**Completion means** the requested bounded outcome exists at the canonical owner, the strongest available applicable proof is identified without overclaiming, and the commit is confirmed on the intended ref. If the result depends on unavailable runtime evidence, finish the source-valid portion and state the exact unresolved runtime claim; do not automatically expand scope, claim full runtime success, or require user-local tooling for source decisions.

A map-specific bug encountered during development can supply a regression example, not authority to modify that map or to promote it into a production Bug Report. Conversely, a detection gap discovered during MAP BUG AUDIT requires explicit handoff before any system development.

## Development decision quality

Apply these four decisions within DEFINE → INVESTIGATE → DESIGN → VERIFY. They are reasoning checks, not additional workflow stages or persisted statuses.

1. **Problem classification:** identify whether the request is a verified implementation defect, a missing required capability, an intentional design change, a documentation/contract mismatch, or an unproven hypothesis. A user-reported symptom is evidence to investigate, not proof of root cause. Keep unproven claims explicit.
2. **Root-cause discrimination:** locate the earliest canonical owner whose behavior or contract contradicts the expected result. Compare current source with the requirement and seek one discriminating observation or reduced fixture where ambiguity remains. Fixing downstream output cannot substitute for fixing an upstream incorrect owner.
3. **Solution selection:** compare no change, deletion, correction within the existing owner, reuse of an existing capability, and minimal addition—in that order. Reject parallel registries, generic managers, speculative fallbacks, and changes that do not address the established cause. Record why a new abstraction is necessary if selected.
4. **Completion discipline:** accept only the originally scoped observable outcome with matching proof; inspect affected downstream consumers and regressions. Distinguish implementation present, source verified, executable verified, and Minecraft runtime verified. Do not convert an unrelated failure, unresolved runtime claim, or future improvement opportunity into automatic scope expansion.

When evidence is insufficient, state the **exact undecided claim**, what current evidence says, and the **minimum next evidence** that would distinguish alternatives. UNKNOWN is not automatically a bug, a development request, or permission for a new subsystem.

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