import { describe, expect, it } from "vitest";
import {
  assessSelectedMapAuditAdmission,
} from "../src/map-audit-admission.js";

const completeDiscovery = {
  status: "COMPLETE" as const,
  discoveredSurfaceIds: ["runtime:state"],
  sourceRelevantFiles: 1,
  sourceIndexedFiles: 1,
  sourceParseFailures: 0,
  sourceAccountedFiles: 1,
  sourceInventoryBalanced: true,
  sourceCoverageComplete: true,
  unresolvedReferences: 0,
  reasons: [],
};

const closedGameplay = {
  status: "CLOSED" as const,
  surfaces: [],
  unaccountedSurfaceIds: [],
  blockingSurfaceIds: [],
  unknownSurfaceIds: [],
  stateModelComplete: true,
  boundariesExtracted: true,
  reasons: [],
};

describe("selected-map audit admission", () => {
  it("blocks partial discovery instead of treating it as production-ready", () => {
    const result = assessSelectedMapAuditAdmission({
      mandatoryAuditProcedure: undefined,
      gameplayDiscoveryClosure: {
        ...completeDiscovery,
        status: "PARTIAL",
        unresolvedReferences: 1,
      },
      gameplayClosure: closedGameplay,
    });

    expect(
      result.issues.some(
        (issue) =>
          issue.code === "DISCOVERY_PARTIAL",
      ),
    ).toBe(true);
    expect(result.firstBlockingStage).toBe("TARGET");
  });

  it("blocks partial gameplay model closure", () => {
    const result = assessSelectedMapAuditAdmission({
      mandatoryAuditProcedure: undefined,
      gameplayDiscoveryClosure:
        completeDiscovery,
      gameplayClosure: {
        ...closedGameplay,
        status: "PARTIAL",
        unknownSurfaceIds: ["state:unknown"],
      },
    });

    expect(
      result.issues.some(
        (issue) =>
          issue.code === "GAMEPLAY_MODEL_PARTIAL",
      ),
    ).toBe(true);
  });
});
