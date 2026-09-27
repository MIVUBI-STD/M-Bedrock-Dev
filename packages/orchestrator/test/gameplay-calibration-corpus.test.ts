import { describe, expect, it } from "vitest";
import {
  compareGameplayCalibrationReports,
  parseGameplayCalibrationManifest,
  type GameplayCalibrationReport,
} from "../src/gameplay-calibration-corpus.js";
import type {
  GameplayUnderstandingFingerprint,
} from "../src/gameplay-understanding-fingerprint.js";

function fingerprint(
  nodes: number,
  unknowns = 0,
): GameplayUnderstandingFingerprint {
  const kinds = {
    game: 0,
    mechanic: 1,
    actor: 0,
    role: 0,
    objective: 0,
    phase: 0,
    state: 1,
    resource: 0,
    lifecycle: 1,
    "spatial-region": 0,
    policy: 0,
    outcome: 0,
  } as const;
  const statuses = {
    authored: 2,
    inferred: Math.max(0, nodes - 2),
    hypothesis: 0,
  } as const;
  const edges = {
    owns: 0,
    "participates-in": 0,
    produces: 0,
    consumes: 0,
    "transitions-to": 0,
    "valid-during": 0,
    "scoped-to": 0,
    "located-in": 0,
    resets: 0,
    persists: 0,
    requires: 0,
    excludes: 0,
    "recovers-to": 0,
    "wins-by": 0,
    "loses-by": 0,
  } as const;

  return {
    schemaVersion: 1,
    sourceShape: {
      files: 1,
      scripts: 1,
      authoredSourceFiles: 0,
      entities: 0,
      functions: 0,
    },
    totals: {
      nodes,
      edges: 0,
      invariants: 0,
      unknowns,
    },
    nodeKinds: { ...kinds },
    nodeStatuses: { ...statuses },
    authoredNodeKinds: {
      ...kinds,
      mechanic: 0,
      state: 1,
      lifecycle: 1,
    },
    edgeKinds: { ...edges },
    evidenceOrigins: {
      "source-code": 1,
    },
    spatial: {
      profiledRegions: 0,
      routeProfiles: 0,
      routePoints: 0,
      localProfiles: 0,
      worldProfiles: 0,
      unknownProfiles: 0,
      contextSeries: 0,
    },
    policy: {
      policies: 0,
      outcomes: 0,
      authoredPolicyEdges: 0,
      admissibilityInvariants: 0,
      coverageUnknowns: 0,
    },
    epistemic: {
      authoredRatio: nodes === 0 ? 0 : 2 / nodes,
      inferredRatio:
        nodes === 0 ? 0 : Math.max(0, nodes - 2) / nodes,
      hypothesisRatio: 0,
      unknownsPerNode:
        nodes === 0 ? 0 : unknowns / nodes,
    },
  };
}

describe("gameplay calibration corpus", () => {
  it("parses learning descriptors without encoding expected semantic answers", () => {
    const manifest =
      parseGameplayCalibrationManifest({
        schemaVersion: 1,
        id: "sample-corpus",
        cases: [
          {
            id: "map-a",
            label: "Map A",
            artifactFile: "Map A.mcworld",
            sourceStyle: "bundled-minified",
            learningDimensions: [
              "recovery",
              "spatial-routing",
              "recovery",
            ],
          },
        ],
      });

    expect(manifest.cases[0]).toEqual({
      id: "map-a",
      label: "Map A",
      artifactFile: "Map A.mcworld",
      sourceStyle: "bundled-minified",
      learningDimensions: [
        "recovery",
        "spatial-routing",
      ],
    });
  });

  it("compares corpus reports case-by-case", () => {
    const baseline: GameplayCalibrationReport = {
      schemaVersion: 1,
      corpusId: "sample-corpus",
      cases: [
        {
          id: "map-a",
          label: "Map A",
          sourceStyle: "bundled-minified",
          learningDimensions: ["recovery"],
          fingerprint: fingerprint(3),
        },
      ],
      aggregate: {
        caseCount: 1,
        sourceStyles: {
          "bundled-minified": 1,
        },
        learningDimensions: {
          recovery: 1,
        },
        mapsWithUnknownIntent: 0,
        totalUnknownIntent: 0,
        totalNodes: 3,
        totalAuthoredNodes: 2,
        totalInferredNodes: 1,
        intentKindPresence: {
          lifecycle: 1,
          mechanic: 1,
          state: 1,
        },
        routeProfileCases: 0,
        routePointTotal: 0,
      },
    };

    const current: GameplayCalibrationReport = {
      ...baseline,
      cases: [
        {
          ...baseline.cases[0]!,
          fingerprint: fingerprint(3, 1),
        },
      ],
    };

    const drift =
      compareGameplayCalibrationReports(
        baseline,
        current,
      );

    expect(drift.missingCaseIds).toEqual([]);
    expect(drift.addedCaseIds).toEqual([]);
    expect(drift.regressionSignals).toContain(
      "unknown-intent-count-increased",
    );
  });
});
