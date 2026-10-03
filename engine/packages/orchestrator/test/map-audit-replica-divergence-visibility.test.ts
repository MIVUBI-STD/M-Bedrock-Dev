import { describe, expect, it } from "vitest";
import {
  projectBlindSpotNeedValidationIssues,
} from "../src/map-audit-validation-blindspots.js";

describe("replica divergence visibility", () => {
  it("surfaces unclassified replica divergence as NEED_VALIDATION", () => {
    const result =
      projectBlindSpotNeedValidationIssues({
        discoveryChallenges: [],
        sharedResourceSignals: [],
        replicaDivergenceIds: [
          "replica-delta:arena:4",
        ],
      });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      status: "NEED_VALIDATION",
      causalLinkId:
        "replica-delta:arena:4",
      validationGroupKey:
        "full-map-replica:replica-delta:arena:4",
    });
  });
});
