import { describe, expect, it } from "vitest";
import {
  adjudicateIntent,
} from "../../src/diagnosis/intent-adjudication.js";

const resolvedRule = {
  rule: {
    id: "friendly-fire",
    statement: "Same-team damage is forbidden.",
    outcome: "forbidden" as const,
  },
  authority: "authoritative" as const,
};

describe("intent adjudication", () => {
  it("routes a proven contradiction to suspected defect", () => {
    expect(adjudicateIntent({
      resolvedRule,
      relation: "contradicts-observed",
      observationEvidenceIds: ["runtime:1"],
    }).disposition).toBe("suspected-defect");
  });

  it("keeps matching mechanics out of bug reporting", () => {
    expect(adjudicateIntent({
      resolvedRule,
      relation: "supports-observed",
      observationEvidenceIds: ["runtime:1"],
    }).disposition).toBe("working-as-designed");
  });

  it("routes balance concerns that match intent to design review", () => {
    expect(adjudicateIntent({
      resolvedRule,
      relation: "supports-observed",
      concernKind: "balance",
      observationEvidenceIds: ["runtime:1"],
    }).disposition).toBe("design-review");
  });

  it("fails closed when intent is missing", () => {
    expect(adjudicateIntent({
      relation: "unclear",
      observationEvidenceIds: ["runtime:1"],
    }).disposition).toBe("design-ambiguous");
  });
});
