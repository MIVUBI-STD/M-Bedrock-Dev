# Next Action

M-Bedrock-Dev now has an evidence-bounded knowledge/runtime profile, causal repair gate, and initial execution/state/temporal Semantic IR.

## Completed foundations

- runtime-profile v2 and tri-state applicability;
- evidence-backed knowledge claims;
- causal proof ladder where observation is not causation;
- Semantic IR for execution, state, and temporal boundaries;
- Semantic IR evidence gaps feeding causal/probe planning;
- repair decision basis bound to source, graph, Semantic IR, runtime evidence, and target context.

## Current lane — Preservation Engine

1. **Pre-mutation baseline** — every autonomous repair must identify invariants that are broken and invariants that are already healthy.
2. **Must-change / must-preserve contract** — an invariant cannot belong to both sets, and diagnostic-only rules cannot authorize preservation proof.
3. **Mutation authorization gate** — working-copy mutation requires a current preservation contract/baseline with explicit baseline evidence.
4. **Post-repair preservation verification** — the intended broken invariants and known-good invariants must both pass after repair.
5. **Forbidden side effects** — declared forbidden effects require complete observation and must not occur.
6. **Release gate** — static, transitive, runtime, preservation, and package proof are all required for release eligibility.
7. **Proof staleness** — changes to preservation contract/baseline or Semantic IR invalidate old decision lineage.

## Explicit limits

Preservation proof is only as strong as its invariant registry and observations.

The current engine does not infer every known-good behavior automatically. Missing baseline coverage remains a blocker for autonomous mutation/release rather than being guessed.

## Next after Preservation Engine

Build the Runtime Laboratory:

- controlled micro-world experiments;
- exact Bedrock/Education/BDS runtime profiles;
- repeatable observation capture;
- entity/chunk/scheduler experiments;
- empirical knowledge promotion.

The immediate safety target is simple: a repair may not be called safe merely because the reported symptom disappears. It must also prove that declared known-good behavior remains intact.
