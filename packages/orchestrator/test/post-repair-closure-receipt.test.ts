import { describe, expect, it } from "vitest";
import type {
  RepairLifecycleState,
} from "../src/index.js";
import {
  createPostRepairClosureReceipt,
  evaluatePostRepairClosure,
} from "../src/index.js";

function lifecycle(): RepairLifecycleState {
  return {
    transactionId: "tx",
    stage: "static-validated",
    mutationPresent: true,
    localStaticValidationPassed: true,
    transitiveRevalidationComplete: true,
    runtimeVerificationComplete: true,
    preservationVerificationComplete: true,
    packageVerificationComplete: true,
    pendingNodeIds: [],
    pendingPaths: [],
    reasons: [],
  };
}

describe("post-repair closure receipt", () => {
  it("requires explicit evidence from every proof layer", () => {
    const result = evaluatePostRepairClosure(
      lifecycle(),
      {
        transactionId: "tx",
        scenarioId: "regression:arena-release",
        originalDefectReproduced: false,
        evidenceIds: ["regression:pass"],
      },
    );

    const receipt =
      createPostRepairClosureReceipt(
        result,
        {
          transitive: ["static:dependent-pass"],
          runtime: ["runtime:pass"],
          preservation: ["preservation:pass"],
          package: ["package:pass"],
        },
      );

    expect(receipt.evidenceIds).toEqual([
      "package:pass",
      "preservation:pass",
      "regression:pass",
      "runtime:pass",
      "static:dependent-pass",
    ]);
  });

  it("rejects incomplete proof-layer evidence", () => {
    const result = evaluatePostRepairClosure(
      lifecycle(),
      {
        transactionId: "tx",
        scenarioId: "regression:arena-release",
        originalDefectReproduced: false,
        evidenceIds: ["regression:pass"],
      },
    );

    expect(() =>
      createPostRepairClosureReceipt(
        result,
        {
          transitive: [],
          runtime: ["runtime:pass"],
          preservation: ["preservation:pass"],
          package: ["package:pass"],
        },
      )
    ).toThrow(/transitive evidence/i);
  });
});
