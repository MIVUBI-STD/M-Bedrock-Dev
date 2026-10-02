import { describe, expect, it } from "vitest";
import {
  assessAuditRisk,
} from "../src/index.js";

describe("audit risk", () => {
  it("keeps simple surfaces static", () => {
    expect(
      assessAuditRisk({
        surfaceId: "surface:copy",
        factors: [],
      }),
    ).toMatchObject({
      priority: "low",
      proofDepth: "static",
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
});
