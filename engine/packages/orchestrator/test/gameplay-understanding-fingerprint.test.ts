import { describe, expect, it } from "vitest";
import type { InspectArtifactResult } from "../src/inspect-artifact.js";
import {
  compareGameplayUnderstandingFingerprints,
  deriveGameplayUnderstandingFingerprint,
} from "../src/gameplay-understanding-fingerprint.js";

function result(): InspectArtifactResult {
  return {
    files: 10,
    scripts: 2,
    functions: 3,
    entities: 1,
    routeAnalysis: {
      contracts: 2,
      explicitContracts: 0,
      derivedContracts: 2,
      effectiveContracts: 2,
      overlaps: 0,
      dimensionUnresolved: 0,
    },
    gameplayIntent: {
      authoredSourceFiles: 1,
      nodes: 4,
      authoredNodes: 3,
      inferredNodes: 1,
      hypothesisNodes: 0,
      invariants: 1,
      unknowns: 0,
      model: {
        schemaVersion: 1,
        id: "intent:test",
        evidence: [
          {
            id: "e:1",
            origin: "source-code",
            locator: "scripts/main.ts",
            summary: "state",
          },
          {
            id: "e:2",
            origin: "runtime-observation",
            locator: "runtime",
            summary: "route",
          },
        ],
        nodes: [
          {
            id: "state:active",
            kind: "state",
            label: "Active",
            status: "authored",
            evidenceIds: ["e:1"],
          },
          {
            id: "lifecycle:cleanup",
            kind: "lifecycle",
            label: "Cleanup",
            status: "authored",
            evidenceIds: ["e:1"],
          },
          {
            id: "policy:cleanup",
            kind: "policy",
            label: "Cleanup policy",
            status: "authored",
            evidenceIds: ["e:1"],
            policyPredicate: {
              kind: "unknown",
              text: "minified guard",
            },
          },
          {
            id: "spatial-region:route-main",
            kind: "spatial-region",
            label: "Main",
            status: "inferred",
            evidenceIds: ["e:2"],
            spatialProfile: {
              coordinateSpace: "local",
              routeId: "main",
              points: [
                { x: 0, y: 0, z: 0, index: 0 },
                { x: 1, y: 0, z: 0, index: 1 },
              ],
              transform: {
                kind: "offset",
                offsetPath: "gameplayOffset",
                functionName: "offset",
              },
              contextSeries: {
                collectionName: "arenas",
                contextCount: 2,
                offsetPath: "gameplayOffset",
                offsetBase: { x: 0, y: 0, z: 0 },
                offsetStride: { x: 100, y: 0, z: 0 },
              },
            },
          },
        ],
        edges: [
          {
            id: "edge:cleanup-policy",
            from: "lifecycle:cleanup",
            to: "policy:cleanup",
            kind: "requires",
            status: "authored",
            evidenceIds: ["e:1"],
          },
        ],
        invariants: [
          {
            id: "inv:cleanup",
            statement: "Cleanup requires policy.",
            strength: "must",
            status: "authored",
            subjectIds: ["lifecycle:cleanup"],
            evidenceIds: ["e:1"],
          },
        ],
        unknowns: [],
      },
    },
  } as unknown as InspectArtifactResult;
}

describe("gameplay understanding fingerprint", () => {
  it("normalizes semantic coverage without preserving map-specific names", () => {
    const fingerprint =
      deriveGameplayUnderstandingFingerprint(result());

    expect(fingerprint).toEqual(expect.objectContaining({
      schemaVersion: 1,
      sourceShape: {
        files: 10,
        scripts: 2,
        authoredSourceFiles: 1,
        entities: 1,
        functions: 3,
      },
      totals: {
        nodes: 4,
        edges: 1,
        invariants: 1,
        unknowns: 0,
      },
      spatial: expect.objectContaining({
        routeProfiles: 1,
        routePoints: 2,
        derivedRouteContracts: 2,
        effectiveRouteContracts: 2,
        localProfiles: 1,
        contextSeries: 1,
      }),
      epistemic: {
        authoredRatio: 0.75,
        inferredRatio: 0.25,
        hypothesisRatio: 0,
        unknownsPerNode: 0,
      },
    }));
    expect(fingerprint.policy.unknownPredicates).toBe(1);
    expect(fingerprint.nodeKinds.state).toBe(1);
    expect(fingerprint.nodeKinds.lifecycle).toBe(1);
    expect(fingerprint.evidenceOrigins).toEqual({
      "runtime-observation": 1,
      "source-code": 1,
    });
  });

  it("surfaces understanding regressions without turning them into semantic policy", () => {
    const baseline =
      deriveGameplayUnderstandingFingerprint(result());
    const current = {
      ...baseline,
      totals: {
        ...baseline.totals,
        nodes: 3,
        unknowns: 1,
      },
      nodeStatuses: {
        ...baseline.nodeStatuses,
        authored: 2,
      },
      nodeKinds: {
        ...baseline.nodeKinds,
        lifecycle: 0,
      },
      spatial: {
        ...baseline.spatial,
        routeProfiles: 0,
        routePoints: 0,
      },
    };

    const drift =
      compareGameplayUnderstandingFingerprints(
        baseline,
        current,
      );

    expect(drift.regressionSignals).toEqual(
      expect.arrayContaining([
        "unknown-intent-count-increased",
        "authored-intent-count-decreased",
        "authored-route-profile-count-decreased",
        "authored-route-point-count-decreased",
        "intent-kind-coverage-lost",
      ]),
    );
    expect(drift.lostKinds).toContain("lifecycle");
  });
});
