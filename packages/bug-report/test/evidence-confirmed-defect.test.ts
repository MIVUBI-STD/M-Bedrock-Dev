import { describe, expect, it } from "vitest";
import {
  confirmedDefectFromEvidence,
} from "../src/evidence-confirmed-defect.js";

const base = {
  subjectIds: ["arena:3"],
  brokenInvariantIds: ["arena.release"],
  foundBy: "ai" as const,
  expectedBehaviorAuthority: "explicit-requirement" as const,
  expectedStatement: "Arena must return to an available state.",
  expectedEvidenceIds: ["requirement:arena-release"],
  observedStatement: "Static analysis found a possible unreleased terminal path.",
  observedEvidenceIds: ["static:lifecycle-path"],
  confirmationEvidence: "Static candidate only.",
  impact: {
    progression: "degraded" as const,
    recovery: "abnormal" as const,
    stability: "stable" as const,
    coreMechanic: "correct" as const,
    importantState: "materially-wrong" as const,
    fairness: "unaffected" as const,
  },
  primaryFailure: "session-concurrency" as const,
  title: "Arena may remain leased",
  problem: "A terminal path may fail to release the arena.",
  sourceEvidence: [{
    source: {
      artifactId: "artifact:test",
      relativePath: "scripts/arena.ts",
    },
    reason: "Terminal path has no proven release continuation.",
  }],
  aiAnalysis: "Static lifecycle analysis found an unresolved release path.",
};

describe("confirmed defect evidence adapter", () => {
  it("does not promote an AI static suspicion without contract or runtime proof", () => {
    expect(
      confirmedDefectFromEvidence(base),
    ).toBeUndefined();
  });

  it("promotes a proven authored-contract violation into a confirmed defect", () => {
    const defect = confirmedDefectFromEvidence({
      ...base,
      authoredContractViolation: true,
      confirmationEvidence:
        "All reachable continuations from the terminal path fail the explicit arena-release invariant.",
    });

    expect(defect?.confirmation.basis).toBe(
      "authored-contract-violation",
    );
    expect(defect?.semanticKey).toContain(
      "invariants=arena.release",
    );
  });
});
