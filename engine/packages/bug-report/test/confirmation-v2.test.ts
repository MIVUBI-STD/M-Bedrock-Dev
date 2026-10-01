import {
  describe,
  expect,
  it,
} from "vitest";
import {
  confirmDefectForReport,
} from "../src/index.js";

describe("defect confirmation for report promotion", () => {
  it("confirms a tester-found reproducible gameplay mismatch", () => {
    const result = confirmDefectForReport({
      foundBy: "tester",
      expectedBehaviorAuthority: "explicit-requirement",
      testerReproduced: true,
      evidence: "The second match cannot start after completing the first match.",
    });

    expect(result.confirmed).toBe(true);
    if (!result.confirmed) return;
    expect(result.confirmation.basis).toBe(
      "tester-reproduction",
    );
  });

  it("confirms an AI-found authored contract violation", () => {
    const result = confirmDefectForReport({
      foundBy: "ai",
      expectedBehaviorAuthority: "explicit-requirement",
      authoredContractViolation: true,
      evidence:
        "Session cleanup returns the player to lobby without clearing match-owned inventory required to reset at match end.",
    });

    expect(result.confirmed).toBe(true);
    if (!result.confirmed) return;
    expect(result.confirmation.basis).toBe(
      "authored-contract-violation",
    );
  });

  it("confirms runtime mismatch without requiring root-cause proof", () => {
    const result = confirmDefectForReport({
      foundBy: "ai",
      expectedBehaviorAuthority: "explicit-requirement",
      runtimeMismatchObserved: true,
      evidence:
        "Observed player state violates the established arena lifecycle after reconnect.",
    });

    expect(result.confirmed).toBe(true);
    if (!result.confirmed) return;
    expect(result.confirmation.basis).toBe(
      "runtime-observation",
    );
  });

  it("rejects a version difference by itself", () => {
    const result = confirmDefectForReport({
      foundBy: "ai",
      expectedBehaviorAuthority: "explicit-requirement",
      compatibilityDifferenceOnly: true,
      evidence: "Base 1.26.20 differs from Tested 1.26.32.",
    });

    expect(result.confirmed).toBe(false);
  });

  it("rejects risk-only AI findings", () => {
    const result = confirmDefectForReport({
      foundBy: "ai",
      expectedBehaviorAuthority: "explicit-requirement",
      evidence:
        "Static topology suggests a possible stale session path.",
    });

    expect(result.confirmed).toBe(false);
  });

  it("rejects repeatable behavior without qualifying mismatch evidence", () => {
    const result = confirmDefectForReport({
      foundBy: "tester",
      expectedBehaviorAuthority: "runtime-contract",
      testerReproduced: false,
      evidence: "The observed behavior is repeatable, but no qualifying mismatch evidence was established.",
    });

    expect(result.confirmed).toBe(false);
  });

  it("rejects working-as-designed adjudication even when behavior is repeatable", () => {
    const result = confirmDefectForReport({
      foundBy: "tester",
      expectedBehaviorAuthority: "authored-intent",
      intentDisposition: "working-as-designed",
      testerReproduced: true,
      evidence: "The mechanic repeats consistently.",
    });

    expect(result.confirmed).toBe(false);
  });

  it("rejects design ambiguity instead of inventing a bug expectation", () => {
    const result = confirmDefectForReport({
      foundBy: "ai",
      expectedBehaviorAuthority: "authored-intent",
      intentDisposition: "design-ambiguous",
      runtimeMismatchObserved: true,
      evidence: "Runtime differs from an inferred expectation.",
    });

    expect(result.confirmed).toBe(false);
  });

  it("allows suspected-defect adjudication to continue through normal evidence gates", () => {
    const result = confirmDefectForReport({
      foundBy: "tester",
      expectedBehaviorAuthority: "explicit-requirement",
      intentDisposition: "suspected-defect",
      testerReproduced: true,
      evidence: "Observed gameplay contradicts the approved rule.",
    });

    expect(result.confirmed).toBe(true);
  });
});
