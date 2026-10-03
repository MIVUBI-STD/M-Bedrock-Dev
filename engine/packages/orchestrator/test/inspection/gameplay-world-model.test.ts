import { describe, expect, it } from "vitest";
import { deriveGameplayWorldModel } from "../../src/inspection/gameplay-world-model.js";

describe("gameplay world model", () => {
  it("summarizes gameplay and arena subsystems without copying raw evidence", () => {
    const result = deriveGameplayWorldModel({
      artifactId: "map:test",
      intent: {
        schemaVersion: 1,
        id: "intent:test",
        evidence: [],
        nodes: [
          {
            id: "objective:flag",
            kind: "objective",
            label: "Flag",
            status: "authored",
            evidenceIds: [],
          },
          {
            id: "phase:active",
            kind: "phase",
            label: "Active",
            status: "inferred",
            evidenceIds: [],
          },
        ],
        edges: [],
        invariants: [{
          id: "inv:start",
          statement: "Start only when ready",
          strength: "must",
          status: "authored",
          subjectIds: ["phase:active"],
          evidenceIds: [],
        }],
        unknowns: [],
      },
      arena: {
        autoDetected: true,
        spatialLayout: {
          basis: "topology",
          replicas: [{}, {}],
        },
        lifecycle: {
          terminalCandidates: 2,
          proven: 1,
          partial: 1,
          unresolved: 0,
          assessments: [],
        },
      },
      scriptSpatial: {
        resolvedEffects: [],
        structurePlacements: [],
        failures: [],
        extractedMutations: 0,
        rejectedMutations: 0,
      },
      semanticIr: {
        stateSurfaces: 3,
        stateOperations: 8,
      },
      broadWrites: 1,
      structures: {
        definitions: 2,
        loads: 3,
        unresolvedLoads: 0,
        placements: 3,
        runtimeLogicLoads: 1,
      },
      entities: {
        definitions: 4,
        knowledgePrerequisiteGaps: 0,
        staticAnalysisLimits: 1,
      },
      unsupportedSurfaceSignals: {
        teleport: true,
        uiForm: true,
        environment: true,
        asyncCommandTransaction: true,
        dynamicCommand: true,
      },
    });

    expect(result.arenas.count).toBe(3);
    expect(result.subjects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "objective",
          authored: 1,
        }),
      ]),
    );
    expect(result.state.broadWrites).toBe(1);
    expect(result.gameplayClosure.status).toBe("OPEN");
    expect(
      result.gameplayClosure.surfaces.map(
        (surface) => surface.id,
      ),
    ).toContain("runtime:arena-capacity");
    expect(
      result.gameplayClosure.unknownSurfaceIds,
    ).toEqual(
      expect.arrayContaining([
        "runtime:teleport",
        "runtime:ui-form",
        "runtime:environment",
        "runtime:async-command-transaction",
        "runtime:dynamic-command",
      ]),
    );
  });
});
