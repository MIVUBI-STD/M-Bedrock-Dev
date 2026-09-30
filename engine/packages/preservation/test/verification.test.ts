import { describe, expect, it } from "vitest";
import {
  comparePreservationSemanticTraces,
  evaluatePreservationVerification,
  type PreservationSemanticTrace,
  type PreservationTraceEquivalencePolicy,
  type RepairPreservationContract,
} from "../src/index.js";

const contract: RepairPreservationContract = {
  schemaVersion: 1,
  id: "preserve:tx-1",
  transactionId: "tx-1",
  mustChangeInvariantIds: ["inv:broken"],
  mustPreserveInvariantIds: ["inv:healthy"],
  forbiddenSideEffectIds: ["effect:cross-arena"],
  semanticTracePolicyId: "trace-policy",
};

const policy: PreservationTraceEquivalencePolicy = {
  schemaVersion: 1,
  id: "trace-policy",
  requiredCheckpointIds: ["ready"],
  mustPreserveStateKeys: ["arena.score"],
  mustChangeStateKeys: ["player.phase"],
};

function trace(phase: string, score = 5): PreservationSemanticTrace {
  return {
    schemaVersion: 1,
    complete: true,
    frames: [{
      checkpointId: "ready",
      occurrence: 0,
      tick: 10,
      values: {
        "player.phase": phase,
        "arena.score": score,
      },
    }],
  };
}

const invariantResults = [{
  invariantId: "inv:broken",
  state: "satisfied" as const,
  evidenceIds: ["after:broken"],
}, {
  invariantId: "inv:healthy",
  state: "satisfied" as const,
  evidenceIds: ["after:healthy"],
}];

describe("post-repair preservation verification", () => {
  it("passes only when invariants, side effects, and semantic trace are all proven", () => {
    const comparison = comparePreservationSemanticTraces(
      trace("starting"),
      trace("playing"),
      policy,
    );

    const receipt = evaluatePreservationVerification({
      contract,
      postRepairInvariantResults: invariantResults,
      traceComparison: comparison,
      observedSideEffectIds: [],
      sideEffectObservationComplete: true,
    });

    expect(receipt.passed).toBe(true);
    expect(receipt.semanticTraceDisposition).toBe("changed-as-intended");
  });

  it("fails closed when semantic trace verification is required but missing", () => {
    const receipt = evaluatePreservationVerification({
      contract,
      postRepairInvariantResults: invariantResults,
      observedSideEffectIds: [],
      sideEffectObservationComplete: true,
    });

    expect(receipt.passed).toBe(false);
    expect(receipt.reasons?.join(" ")).toMatch(/requires semantic trace verification/);
  });

  it("blocks unexpected preserved-state drift", () => {
    const comparison = comparePreservationSemanticTraces(
      trace("starting", 5),
      trace("playing", 0),
      policy,
    );

    const receipt = evaluatePreservationVerification({
      contract,
      postRepairInvariantResults: invariantResults,
      traceComparison: comparison,
      observedSideEffectIds: [],
      sideEffectObservationComplete: true,
    });

    expect(receipt.passed).toBe(false);
    expect(receipt.unexpectedBehaviorKeys).toContain("arena.score");
  });

  it("blocks forbidden side effects and incomplete side-effect observation", () => {
    const comparison = comparePreservationSemanticTraces(
      trace("starting"),
      trace("playing"),
      policy,
    );

    const receipt = evaluatePreservationVerification({
      contract,
      postRepairInvariantResults: invariantResults,
      traceComparison: comparison,
      observedSideEffectIds: ["effect:cross-arena"],
      sideEffectObservationComplete: false,
    });

    expect(receipt.passed).toBe(false);
    expect(receipt.observedForbiddenSideEffectIds).toEqual(["effect:cross-arena"]);
    expect(receipt.reasons?.join(" ")).toMatch(/complete side-effect observation/);
  });
});
