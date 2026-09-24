import { describe, expect, it } from "vitest";
import type {
  CompiledDiagnosticInvariant,
} from "../../knowledge/src/index.js";
import {
  materializeInvariantRegistry,
} from "../src/invariant-registry.js";

function invariant(
  id: string,
  kind: CompiledDiagnosticInvariant["invariantKind"],
): CompiledDiagnosticInvariant {
  return {
    id,
    relationId: id,
    relationKind:
      kind === "temporal-order" ? "queues-behind" : "requires",
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
    classification: "project-policy",
    knowledgeSourceIds: ["source"],
  };
}

describe("global invariant registry", () => {
  it("materializes executable state and temporal invariants", () => {
    const registry = materializeInvariantRegistry([
      invariant("state", "requires-state"),
      invariant("temporal", "temporal-order"),
    ], {
      knowledgeRevision: "knowledge-r1",
      profileKey: "bedrock:1.26.40",
      scope: { arenaId: "arena-1", arenaGeneration: 2 },
    });

    expect(registry.entries).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "state",
        enforcement: "runtime-state",
        minimumRepairClaim: "proven-runtime",
      }),
      expect.objectContaining({
        id: "temporal",
        enforcement: "runtime-temporal",
        minimumRepairClaim: "proven-runtime",
      }),
    ]));
  });

  it("is deterministic across input ordering", () => {
    const a = invariant("a", "requires-state");
    const b = invariant("b", "temporal-order");

    const left = materializeInvariantRegistry([a, b], {
      knowledgeRevision: "r1",
      profileKey: "bedrock",
    });
    const right = materializeInvariantRegistry([b, a], {
      knowledgeRevision: "r1",
      profileKey: "bedrock",
    });

    expect(left.revision).toBe(right.revision);
    expect(left.entries).toEqual(right.entries);
  });

  it("keeps open assumptions diagnostic-only", () => {
    const open = {
      ...invariant("open", "requires-state"),
      classification: "open-assumption" as const,
    };

    const registry = materializeInvariantRegistry([open], {
      knowledgeRevision: "r1",
      profileKey: "education",
    });

    expect(registry.entries[0]).toMatchObject({
      enforcement: "diagnostic-only",
      minimumRepairClaim: "hypothesis",
    });
  });
});
