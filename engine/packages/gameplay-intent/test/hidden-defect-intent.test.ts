import { describe, expect, it } from "vitest";
import {
  assessMechanicCompleteness,
  challengeDesignIntent,
} from "../src/index.js";

describe("hidden gameplay defect intent analysis", () => {
  it("does not accept implementation-only behavior as grounded design", () => {
    const result = challengeDesignIntent({
      implementationEvidenceIds: ["source:max-concurrent-arenas"],
      independentDesignEvidenceIds: [],
    });

    expect(result.disposition).toBe("implementation-only");
  });

  it("accepts independent selected-artifact design evidence", () => {
    const result = challengeDesignIntent({
      implementationEvidenceIds: ["source:limit"],
      independentDesignEvidenceIds: ["dialogue:queue-rule"],
    });

    expect(result.disposition).toBe("grounded-design");
  });

  it("finds incomplete declared mechanics", () => {
    const result = assessMechanicCompleteness({
      mechanicId: "mechanic:shears-attacker",
      stages: {
        declared: true,
        reachable: true,
        triggered: true,
        consumed: false,
        "effect-applied": false,
        "player-visible": false,
      },
    });

    expect(result.complete).toBe(false);
    expect(result.missingStages).toContain("consumed");
    expect(result.missingStages).toContain("effect-applied");
  });
});
