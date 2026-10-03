import { describe, expect, it } from "vitest";
import {
  assessGameplayCapabilityDelivery,
} from "../src/index.js";

describe("gameplay capability delivery", () => {
  it("classifies visible capacity that exceeds playable capacity as design failure", () => {
    const result = assessGameplayCapabilityDelivery({
      subjectId: "runtime:arena-capacity",
      label: "Arena capacity",
      playerVisible: true,
      designed: true,
      implementationPresent: true,
      expectedCapacity: 6,
      playableCapacity: 2,
      technicalConstraintReasons: [
        "world ticking-area capacity",
      ],
      evidenceIds: [
        "world:arena-count",
        "capacity:safe-concurrency",
      ],
      playerFacingEvidenceIds: [
        "world:arena-count",
      ],
    });

    expect(result.status).toBe("DEGRADED");
    expect(result.failureClass).toBe(
      "DESIGN_FAILURE",
    );
    expect(result.reportIssueType).toBe(
      "DESIGN_MISMATCH",
    );
    expect(result.expectedCapacity).toBe(6);
    expect(result.playableCapacity).toBe(2);
    expect(result.informationMismatch).toBe(true);
    expect(result.playerFacingEvidenceIds).toEqual([
      "world:arena-count",
    ]);
    expect(result.reason).toMatch(
      /does not deliver/i,
    );
  });

  it("classifies a player-visible designed capability with no implementation as design-implementation mismatch", () => {
    const result = assessGameplayCapabilityDelivery({
      subjectId: "mechanic:shop-upgrade",
      label: "Shop Upgrade",
      playerVisible: true,
      designed: true,
      implementationPresent: false,
      evidenceIds: ["dialogue:shop-upgrade"],
      playerFacingEvidenceIds: [
        "dialogue:shop-upgrade",
      ],
    });

    expect(result.status).toBe("MISSING");
    expect(result.failureClass).toBe(
      "DESIGN_IMPLEMENTATION_MISMATCH",
    );
    expect(result.reportIssueType).toBe(
      "DESIGN_MISMATCH",
    );
    expect(result.informationMismatch).toBe(true);
  });

  it("classifies incomplete implemented behavior as implementation failure", () => {
    const result = assessGameplayCapabilityDelivery({
      subjectId: "mechanic:retry",
      label: "Retry",
      playerVisible: true,
      designed: true,
      implementationPresent: true,
      behaviorComplete: false,
      evidenceIds: ["source:retry"],
    });

    expect(result.status).toBe("DEGRADED");
    expect(result.failureClass).toBe(
      "IMPLEMENTATION_FAILURE",
    );
    expect(result.reportIssueType).toBe("BUG");
  });

  it("does not manufacture a design issue when capability evidence is ungrounded", () => {
    const result = assessGameplayCapabilityDelivery({
      subjectId: "mechanic:unknown",
      label: "Unknown mechanic",
      playerVisible: false,
      designed: false,
    });

    expect(result.status).toBe("UNPROVEN");
    expect(result.failureClass).toBeUndefined();
  });
});
