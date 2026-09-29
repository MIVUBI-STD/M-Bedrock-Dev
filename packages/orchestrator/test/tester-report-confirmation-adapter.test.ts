import {
  describe,
  expect,
  it,
} from "vitest";
import {
  confirmTesterDefectForReport,
} from "../src/tester-report-confirmation-adapter.js";

describe("tester report confirmation adapter", () => {
  it("confirms a reproduced mismatch against an explicit requirement", () => {
    const result = confirmTesterDefectForReport({
      expectedBehaviorAuthority:
        "explicit-requirement",
      expectedEvidenceIds: ["requirement:match-restart"],
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
      expectedEvidenceIds: [],
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
      expectedEvidenceIds: ["requirement:match-restart"],
      reproduced: false,
      evidence:
        "The behavior was observed once but could not be reproduced.",
    });

    expect(result.confirmed).toBe(false);
  });
});
