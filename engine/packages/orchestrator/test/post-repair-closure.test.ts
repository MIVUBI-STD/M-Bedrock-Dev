import { describe, expect, it } from "vitest";
import type {
  RepairLifecycleState,
} from "../src/index.js";
import {
  evaluatePostRepairClosure,
} from "../src/index.js";

function lifecycle(
  complete: boolean,
): RepairLifecycleState {
  return {
    transactionId: "tx",
    stage: "static-validated",
    mutationPresent: true,
    localStaticValidationPassed: true,
    transitiveRevalidationComplete: true,
    runtimeVerificationComplete: complete,
    preservationVerificationComplete: complete,
    packageVerificationComplete: complete,
    pendingNodeIds: [],
    pendingPaths: [],
    reasons: [],
  };
}

describe("post-repair regression closure", () => {
  it("closes a repair only when the original defect is gone and all proof layers are complete", () => {
    const result = evaluatePostRepairClosure(
      lifecycle(true),
      {
        transactionId: "tx",
        scenarioId: "reconnect-counterexample",
        originalDefectReproduced: false,
        evidenceIds: ["runtime:retest:pass"],
      },
    );

    expect(result.disposition).toBe("fixed");
    expect(result.release.disposition).toBe(
      "release-eligible",
    );
  });

  it("marks repair as regression when the original counterexample still reproduces", () => {
    const result = evaluatePostRepairClosure(
      lifecycle(true),
      {
        transactionId: "tx",
        scenarioId: "reconnect-counterexample",
        originalDefectReproduced: true,
        evidenceIds: ["runtime:retest:fail"],
      },
    );

    expect(result.disposition).toBe(
      "regression",
    );
    expect(result.release.disposition).toBe(
      "blocked",
    );
  });

  it("keeps repair incomplete when defect is gone but preservation/package/runtime proof is not complete", () => {
    const result = evaluatePostRepairClosure(
      lifecycle(false),
      {
        transactionId: "tx",
        scenarioId: "reconnect-counterexample",
        originalDefectReproduced: false,
        evidenceIds: ["runtime:retest:pass"],
      },
    );

    expect(result.disposition).toBe(
      "incomplete",
    );
    expect(result.release.disposition).toBe(
      "blocked",
    );
  });

  it("rejects a receipt from another repair transaction", () => {
    expect(() =>
      evaluatePostRepairClosure(
        lifecycle(true),
        {
          transactionId: "other",
          scenarioId: "repro",
          originalDefectReproduced: false,
          evidenceIds: ["e"],
        },
      )
    ).toThrow(/another repair transaction/);
  });
});
