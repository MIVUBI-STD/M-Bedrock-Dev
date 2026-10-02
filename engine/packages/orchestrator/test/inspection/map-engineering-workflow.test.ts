import { describe, expect, it } from "vitest";
import {
  buildMapEngineeringWorkflow,
} from "../../src/inspection/map-engineering-workflow.js";

function baseSource() {
  return {
    artifactId: "map:test",
    fingerprint: "abc",
    targetCompatibility: {
      edition: "bedrock",
      educationFeatures: "unknown",
    },
    gameplaySemantic: {
      gameplayClosure: {
        status: "CLOSED",
        surfaces: [],
        unaccountedSurfaceIds: [],
        blockingSurfaceIds: [],
        unknownSurfaceIds: [],
        stateModelComplete: true,
        boundariesExtracted: true,
        reasons: [],
      },
      intent: {
        unknowns: [],
      },
    },
    gameplayIntentRuntime: {
      routeInstrumentationRequired: 0,
      routeEvidenceBlocked: 0,
    },
    evidenceRecovery: {
      actions: [],
    },
    repairCandidates: [],
    releaseIdentity: {
      status: "consistent",
      observations: [],
      conflicts: [],
    },
    diagnostics: [],
    unresolvedReferences: 0,
  } as any;
}

describe("map engineering workflow projection", () => {
  it("keeps the projection compact and actionable", () => {
    const workflow =
      buildMapEngineeringWorkflow(
        baseSource(),
      );

    expect(
      workflow.stages.map(
        (stage) => stage.id,
      ),
    ).toEqual([
      "understand",
      "diagnose",
      "release",
    ]);

    expect(workflow.attention).toEqual({
      criticalDiagnostics: 0,
      unresolvedReferences: 0,
      contractUnknowns: 0,
      gameplayClosure: "CLOSED",
      evidenceRecoveryActions: 0,
      repairProposals: 0,
    });
  });

  it("keeps understanding partial while selected-artifact semantics are unresolved", () => {
    const source = {
      ...baseSource(),
      unresolvedReferences: 2,
    } as any;

    const workflow =
      buildMapEngineeringWorkflow(source);

    expect(
      workflow.stages.find(
        (item) => item.id === "understand",
      )?.status,
    ).toBe("partial");
    expect(
      workflow.attention.unresolvedReferences,
    ).toBe(2);
  });

  it("blocks understanding and release while gameplay closure is OPEN", () => {
    const source = {
      ...baseSource(),
      gameplaySemantic: {
        ...baseSource().gameplaySemantic,
        gameplayClosure: {
          ...baseSource().gameplaySemantic.gameplayClosure,
          status: "OPEN",
          unaccountedSurfaceIds: ["runtime:arena-capacity"],
          stateModelComplete: false,
        },
      },
    } as any;

    const workflow = buildMapEngineeringWorkflow(source);

    expect(
      workflow.stages.find(
        (item) => item.id === "understand",
      )?.status,
    ).toBe("blocked");
    expect(
      workflow.stages.find(
        (item) => item.id === "release",
      )?.status,
    ).toBe("blocked");
  });

  it("keeps release blocked while critical diagnostics remain", () => {
    const source = {
      ...baseSource(),
      diagnostics: [{
        id: "critical",
        code: "ARENA_VOXEL_DIVERGENCE",
        severity: "critical",
        message: "voxel divergence",
      }],
    } as any;

    const workflow =
      buildMapEngineeringWorkflow(source);

    expect(
      workflow.stages.find(
        (item) => item.id === "release",
      )?.status,
    ).toBe("blocked");
  });
});
