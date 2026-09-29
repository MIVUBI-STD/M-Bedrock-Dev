import {
  describe,
  expect,
  it,
} from "vitest";
import {
  prepareAdaptiveRuntimeProbeBundle,
  type AdaptiveRuntimeProbeInspection,
} from "../src/adaptive-runtime-probe.js";

describe("adaptive runtime probe bundle", () => {
  it("spends a global budget on the highest-value probes first", () => {
    const inspection:
      AdaptiveRuntimeProbeInspection = {
      causalAnalysis: {
        incidents: [{
          id: "incident:a",
          scopeKey: "a",
          severity: "major",
          confidence: "medium",
          chainIds: [],
          relatedDiagnosticIds: [],
          nodes: [],
          links: [],
          rootCauseCandidates: [{
            id: "candidate:a1",
            label: "A1",
            evidenceLevel:
              "unproven-candidate",
            severity: "major",
            confidence: "medium",
            chainIds: [],
            relatedDiagnosticIds: [],
            support: {
              dependencyViolations: 0,
              evidenceGaps: 1,
              corroboratedRisks: 0,
              observedOutcomes: 0,
            },
          }, {
            id: "candidate:a2",
            label: "A2",
            evidenceLevel:
              "unproven-candidate",
            severity: "major",
            confidence: "medium",
            chainIds: [],
            relatedDiagnosticIds: [],
            support: {
              dependencyViolations: 0,
              evidenceGaps: 1,
              corroboratedRisks: 0,
              observedOutcomes: 0,
            },
          }],
        }],
      },
      diagnosticProbeAnalysis: {
        incidents: [{
          incidentId: "incident:a",
          definitions: [{
            id: "probe:cheap",
            label: "cheap",
            requiredContext:
              "LIVE_MINECRAFT",
            costUnits: 1,
            mutationRisk:
              "read-only",
            outcomes: [{
              id: "present",
              observation: "yes",
              supportsCandidateIds: [
                "candidate:a1",
              ],
              rejectsCandidateIds: [
                "candidate:a2",
              ],
            }],
          }, {
            id: "probe:expensive",
            label: "expensive",
            requiredContext:
              "LIVE_MINECRAFT",
            costUnits: 10,
            mutationRisk:
              "read-only",
            outcomes: [{
              id: "present",
              observation: "yes",
              supportsCandidateIds: [
                "candidate:a1",
              ],
              rejectsCandidateIds: [
                "candidate:a2",
              ],
            }],
          }],
        }],
      },
    };

    const result =
      prepareAdaptiveRuntimeProbeBundle(
        inspection,
        {
          availableContext:
            "LIVE_MINECRAFT",
          bindings: [{
            probeId:
              "probe:cheap",
            predicate: "p",
            query: {
              kind:
                "scoreboard-value",
              objectiveId: "o",
              participant: "#p",
            },
            outcomeByState: {
              present: "present",
              absent: "present",
            },
          }, {
            probeId:
              "probe:expensive",
            predicate: "p",
            query: {
              kind:
                "scoreboard-value",
              objectiveId: "o",
              participant: "#p",
            },
            outcomeByState: {
              present: "present",
              absent: "present",
            },
          }],
          budget: {
            maxRequests: 1,
            maxCostUnits: 2,
          },
        },
      );

    expect(result.usedRequests)
      .toBe(1);
    expect(
      result.selected[0]?.probeId,
    ).toBe("probe:cheap");
    expect(
      result.bundle.requests,
    ).toHaveLength(1);
  });

  it("returns an empty valid bundle when budget is zero", () => {
    const result =
      prepareAdaptiveRuntimeProbeBundle(
        {
          causalAnalysis: {
            incidents: [],
          },
          diagnosticProbeAnalysis: {
            incidents: [],
          },
        },
        {
          availableContext:
            "LIVE_MINECRAFT",
          bindings: [],
          budget: {
            maxRequests: 0,
            maxCostUnits: 0,
          },
        },
      );

    expect(result.bundle.requests)
      .toEqual([]);
    expect(result.usedCostUnits)
      .toBe(0);
  });
});
