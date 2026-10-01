import { describe, expect, it } from "vitest";
import { buildArenaEngineeringProjection } from "../../src/arena/arena-engineering-projection.js";

describe("arena engineering projection", () => {
  it("keeps arena reporting compact and arena-scoped", () => {
    const source = {
      artifactId: "map:test",
      fingerprint: "abc",
      targetCompatibility: {
        edition: "bedrock",
        educationFeatures: "unknown",
      },
      arenaAnalysis: {
        autoDetected: true,
        spatialLayout: {
          basis: "topology",
          canonical: {
            arenaId: "arena-1",
            anchor: { x: 0, y: 0, z: 0 },
          },
          replicas: [{
            arenaId: "arena-2",
            anchor: { x: 100, y: 0, z: 0 },
          }],
          offsets: [{ x: 100, y: 0, z: 0 }],
          confidence: "high",
        },
        lifecycle: {
          terminalCandidates: 1,
          proven: 1,
          partial: 0,
          unresolved: 0,
          assessments: [],
        },
        cleanupSurfaces: {
          acquiredSurfaces: 2,
          terminalAssessments: [],
          exactProven: 2,
          partial: 0,
          unresolved: 0,
        },
        stateIsolation: {
          arenaRegions: 1,
          observations: [],
          isolated: 2,
          partitionProofRequired: 0,
          sharedGlobal: 0,
          unknown: 0,
        },
        stressPlan: {
          status: "unavailable",
          reasons: ["capacity unresolved"],
        },
      },
      diagnostics: [{
        id: "arena:test",
        code: "ARENA_CONCURRENCY_CAPACITY_SHORTFALL",
        severity: "critical",
        message: "capacity shortfall",
      }, {
        id: "other:test",
        code: "SCRIPT_MODULE_UNDECLARED",
        severity: "minor",
        message: "other",
      }],
    } as any;

    const result =
      buildArenaEngineeringProjection(source);

    expect(result.architecture.count).toBe(2);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.code)
      .toBe("ARENA_CONCURRENCY_CAPACITY_SHORTFALL");
    expect(result.stress.status)
      .toBe("unavailable");
  });
});
