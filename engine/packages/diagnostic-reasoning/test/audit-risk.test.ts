import { describe, expect, it } from "vitest";
import {
  assessAuditRisk,
} from "../src/index.js";

describe("audit risk", () => {
  it("keeps simple non-critical surfaces static", () => {
    expect(
      assessAuditRisk({
        surfaceId: "surface:copy",
        factors: [],
      }),
    ).toMatchObject({
      priority: "low",
      proofDepth: "static",
      criticality: "low",
    });
  });

  it("escalates interacting high-risk factors to deep proof", () => {
    expect(
      assessAuditRisk({
        surfaceId: "runtime:persistence",
        factors: [
          "persistence",
          "reload",
          "reconnect",
        ],
      }),
    ).toMatchObject({
      priority: "high",
      proofDepth: "deep",
    });
  });

  it("never deprioritizes a blocker just because technical complexity is low", () => {
    expect(
      assessAuditRisk({
        surfaceId: "runtime:progression-completion",
        factors: [],
        criticality: "blocker",
      }),
    ).toMatchObject({
      technicalRiskScore: 0,
      criticality: "blocker",
      priority: "high",
      proofDepth: "deep",
    });
  });
});
