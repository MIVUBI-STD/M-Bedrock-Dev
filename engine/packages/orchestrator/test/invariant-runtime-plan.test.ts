import { describe, expect, it } from "vitest";
import type { CompiledDiagnosticInvariant } from "../../knowledge/src/index.js";
import { materializeInvariantRuntimePlan } from "../src/invariant-runtime-plan.js";

function invariant(
  id: string,
  kind: CompiledDiagnosticInvariant["invariantKind"],
  classification: CompiledDiagnosticInvariant["classification"] = "project-policy",
): CompiledDiagnosticInvariant {
  return {
    id,
    relationId: id,
    relationKind: kind === "temporal-order" ? "queues-behind" : "requires",
    invariantKind: kind,
    domain: "validation",
    subject: "after",
    object: "before",
    ...(kind === "temporal-order"
      ? {
          beforePredicate: "before",
          afterPredicate: "after",
        }
      : { expectedObjectState: "present" }),
    classification,
    knowledgeSourceIds: ["source"],
  };
}

describe("compiled invariant runtime plan", () => {
  it("materializes temporal invariants without duplicating state evaluation", () => {
    const plan = materializeInvariantRuntimePlan([
      invariant("state", "requires-state"),
      invariant("temporal", "temporal-order"),
    ], { arenaId: "arena-1", arenaGeneration: 2 });

    expect(plan.stateInvariantIds).toEqual(["state"]);
    expect(plan.temporalRequirements).toEqual([
      expect.objectContaining({
        id: "temporal",
        beforePredicate: "before",
        afterPredicate: "after",
        scope: { arenaId: "arena-1", arenaGeneration: 2 },
      }),
    ]);
  });

  it("keeps open assumptions diagnostic-only", () => {
    const plan = materializeInvariantRuntimePlan([
      invariant("assumption", "temporal-order", "open-assumption"),
    ]);

    expect(plan.temporalRequirements).toEqual([]);
    expect(plan.diagnosticOnlyInvariantIds).toEqual(["assumption"]);
  });
});
