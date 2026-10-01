import {
  describe,
  expect,
  it,
} from "vitest";
import {
  confirmTesterDefectForReport,
} from "../../src/reporting/tester-report-confirmation-adapter.js";

describe("tester report confirmation adapter", () => {
  it("confirms a reproduced mismatch against an explicit requirement", () => {
    const result = confirmTesterDefectForReport({
      expectedBehaviorAuthority:
        "explicit-requirement",
      expectedStatement:
        "A second match can start after the first completes.",
      expectedEvidenceIds: ["requirement:match-restart"],
      observationEvidenceIds: ["tester:match-restart"],
      reproduced: true,
      evidence:
        "The second match cannot start after completing the first match.",
    });

    expect(result.confirmed).toBe(true);
    if (!result.confirmed) return;
    expect(result.confirmation.basis).toBe(
      "tester-reproduction",
    );
  });

  it("does not confirm without expected behavior evidence identity", () => {
    const result = confirmTesterDefectForReport({
      expectedBehaviorAuthority:
        "explicit-requirement",
      expectedStatement:
        "A second match can start after the first completes.",
      expectedEvidenceIds: [],
      observationEvidenceIds: ["tester:match-restart"],
      reproduced: true,
      evidence:
        "The behavior is repeatable.",
    });

    expect(result.confirmed).toBe(false);
  });

  it("does not confirm without gameplay observation evidence identity", () => {
    const result = confirmTesterDefectForReport({
      expectedBehaviorAuthority:
        "explicit-requirement",
      expectedStatement:
        "A second match can start after the first completes.",
      expectedEvidenceIds: ["requirement:match-restart"],
      observationEvidenceIds: [],
      reproduced: true,
      evidence:
        "The behavior is repeatable.",
    });

    expect(result.confirmed).toBe(false);
  });

  it("does not confirm an unreproduced tester observation", () => {
    const result = confirmTesterDefectForReport({
      expectedBehaviorAuthority:
        "explicit-requirement",
      expectedStatement:
        "A second match can start after the first completes.",
      expectedEvidenceIds: ["requirement:match-restart"],
      observationEvidenceIds: ["tester:match-restart"],
      reproduced: false,
      evidence:
        "The behavior was observed once but could not be reproduced.",
    });

    expect(result.confirmed).toBe(false);
  });

  it("does not promote selected-artifact behavior that the intent gate classifies as designed", () => {
    const result = confirmTesterDefectForReport({
      expectedBehaviorAuthority: "selected-artifact",
      intentDiagnostic: {
        disposition: "designed-behavior",
        subjectIds: ["combat:team-damage"],
        basisInvariantIds: [],
        basisDesignRuleIds: ["friendly-fire"],
        basisDesignEvidenceIds: ["game-design:offense:rule:friendly-fire"],
        evidenceIds: ["runtime:friendly-fire"],
        nextEvidenceNeed: "none",
        reasons: ["An explicit exception applies."],
      },
      expectedStatement: "Friendly fire is disabled in normal play.",
      expectedEvidenceIds: ["game-design:offense:rule:friendly-fire"],
      observationEvidenceIds: ["runtime:friendly-fire"],
      reproduced: true,
      evidence: "Friendly fire occurred in developer mode.",
    });

    expect(result.confirmed).toBe(false);
  });

  it("allows selected-artifact tester mismatch only after canonical intent confirmation", () => {
    const result = confirmTesterDefectForReport({
      expectedBehaviorAuthority: "selected-artifact",
      intentDiagnostic: {
        disposition: "confirmed-defect",
        subjectIds: ["combat:team-damage"],
        basisInvariantIds: [],
        basisDesignRuleIds: ["friendly-fire"],
        basisDesignEvidenceIds: ["game-design:offense:rule:friendly-fire"],
        evidenceIds: ["runtime:friendly-fire", "tester:same-team-damage"],
        nextEvidenceNeed: "none",
        reasons: ["Observed behavior contradicts approved Game Design."],
      },
      expectedStatement: "Same-team damage is forbidden.",
      expectedEvidenceIds: ["game-design:offense:rule:friendly-fire"],
      observationEvidenceIds: ["runtime:friendly-fire"],
      reproduced: true,
      evidence: "Same-team damage is reproducible.",
    });

    expect(result.confirmed).toBe(true);
  });
});
