import { describe, expect, it } from "vitest";
import { buildMapEngineeringWorkflow } from "../src/map-engineering-workflow.js";

describe("map engineering workflow projection", () => {
  it("keeps release blocked while critical diagnostics remain", () => {
    const source = {
      artifactId: "map:test",
      fingerprint: "abc",
      targetCompatibility: {
        edition: "bedrock",
        educationFeatures: "unknown",
      },
      gameplayWorld: {
        schemaVersion: 1,
        artifactId: "map:test",
        subjects: [],
        arenas: {
          detected: false,
          lifecycle: {
            terminalCandidates: 0,
            proven: 0,
            partial: 0,
            unresolved: 0,
          },
          cleanup: {
            acquiredSurfaces: 0,
            exactProven: 0,
            partial: 0,
            unresolved: 0,
          },
          isolation: {
            isolated: 0,
            partitionProofRequired: 0,
            sharedGlobal: 0,
            unknown: 0,
          },
        },
        spatial: {
          resolvedScriptEffects: 0,
          structurePlacements: 0,
          unresolvedScriptMutations: 0,
          rejectedScriptMutations: 0,
        },
        state: {
          semanticSurfaces: 0,
          semanticOperations: 0,
          broadWrites: 0,
        },
        structures: {
          definitions: 0,
          loads: 0,
          unresolvedLoads: 0,
          placements: 0,
          runtimeLogicLoads: 0,
        },
        entities: {
          definitions: 0,
          knowledgePrerequisiteGaps: 0,
          staticAnalysisLimits: 0,
          resolvedSpawnEvidence: 0,
        },
        intent: {
          invariants: 0,
          unknowns: [],
        },
      },
      arenaAnalysis: {
        autoDetected: false,
      },
      gameplayIntentRuntime: {
        routeInstrumentationRequired: 0,
        routeEvidenceBlocked: 0,
      },
      causalAnalysis: {
        incidents: [],
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
      diagnostics: [{
        id: "critical",
        code: "ARENA_VOXEL_DIVERGENCE",
        severity: "critical",
        message: "voxel divergence",
      }],
      unresolvedReferences: 0,
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
