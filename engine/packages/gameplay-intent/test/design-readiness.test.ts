import { describe, expect, it } from "vitest";
import {
  assessGameplayDesignReadiness,
  type GameplayIntentModel,
} from "../src/index.js";

const model: GameplayIntentModel = {
  schemaVersion: 1,
  id: "design-readiness",
  evidence: [],
  nodes: [{
    id: "objective:flag",
    kind: "objective",
    label: "Flag",
    status: "authored",
    evidenceIds: [],
  }],
  edges: [],
  invariants: [],
  unknowns: [{
    id: "unknown:retry",
    question: "Should objective state reset on retry?",
    blockedSubjectIds: ["objective:flag"],
  }],
};

describe("gameplay design readiness", () => {
  it("blocks when authoritative Game Design is missing", () => {
    const result = assessGameplayDesignReadiness(
      model,
      {
        scopeSubjectIds: ["objective:flag"],
      },
    );

    expect(result.disposition).toBe("blocked");
    expect(result.reasons.join(" ")).toMatch(/authoritative current Game Design/i);
  });


  it("blocks when a material unknown affects the audit scope", () => {
    const result = assessGameplayDesignReadiness(
      model,
      {
        scopeSubjectIds: ["objective:flag"],
        authoritativeDesignAvailable: true,
        materialUnknownIds: ["unknown:retry"],
      },
    );

    expect(result.disposition).toBe("blocked");
  });

  it("allows partial readiness only for explicitly non-material unknowns", () => {
    const result = assessGameplayDesignReadiness(
      model,
      {
        scopeSubjectIds: ["objective:flag"],
        authoritativeDesignAvailable: true,
        nonMaterialUnknownIds: ["unknown:retry"],
      },
    );

    expect(result.disposition).toBe("partial");
  });

  it("is ready when no scoped material unknown remains", () => {
    const result = assessGameplayDesignReadiness(
      model,
      {
        scopeSubjectIds: ["objective:other"],
        authoritativeDesignAvailable: true,
      },
    );

    expect(result.disposition).toBe("ready");
  });
});
