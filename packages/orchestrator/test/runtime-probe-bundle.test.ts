import { describe, expect, it } from "vitest";
import type { CausalIncident } from "../../project-model/src/index.js";
import type {
  DiagnosticProbeDefinition,
  DiagnosticProbePlan,
} from "../../project-model/src/index.js";
import type { RuntimeProbeBinding } from "../../project-model/src/index.js";
import type { DiagnosticProbeAnalysis } from "../src/diagnostic-probe-analysis.js";
import { prepareRuntimeProbeBundle } from "../src/runtime-probe-bundle.js";

const incident: CausalIncident = {
  id: "incident-1",
  scopeKey: "operation-1",
  severity: "medium",
  confidence: "low",
  chainIds: [],
  relatedDiagnosticIds: [],
  nodes: [],
  links: [],
  rootCauseCandidates: [{
    id: "candidate-1",
    label: "block-write",
    evidenceLevel: "unproven-candidate",
    severity: "medium",
    confidence: "low",
    chainIds: [],
    relatedDiagnosticIds: [],
    support: {
      dependencyViolations: 0,
      evidenceGaps: 1,
      corroboratedRisks: 0,
      observedOutcomes: 0,
    },
  }],
};

const definition: DiagnosticProbeDefinition = {
  id: "chunk-ready",
  label: "Observe chunk readiness",
  requiredContext: "LIVE_MINECRAFT",
  costUnits: 1,
  mutationRisk: "read-only",
  outcomes: [{
    id: "ready",
    observation: "ready",
    rejectsCandidateIds: ["candidate-1"],
  }, {
    id: "not-ready",
    observation: "not ready",
    supportsCandidateIds: ["candidate-1"],
  }],
};

const localPlan: DiagnosticProbePlan = {
  incidentId: "incident-1",
  availableContext: "LOCAL_ARTIFACT",
  unresolvedCandidateIds: ["candidate-1"],
  recommended: [],
  blockedByContext: [{
    probeId: "chunk-ready",
    label: "Observe chunk readiness",
    requiredContext: "LIVE_MINECRAFT",
    costUnits: 1,
    mutationRisk: "read-only",
    coveredCandidateIds: ["candidate-1"],
    pairSeparationCount: 0,
    score: 2,
  }],
  stopCondition: "candidate-proven",
};

const analysis: DiagnosticProbeAnalysis = {
  incidents: [{
    incidentId: "incident-1",
    definitions: [definition],
    plan: localPlan,
  }],
  definitions: 1,
  recommended: 0,
  blockedByContext: 1,
};

const binding: RuntimeProbeBinding = {
  probeId: "chunk-ready",
  incidentId: "incident-1",
  predicate: "loaded-target-chunk",
  scope: {
    arenaId: "arena-1",
    arenaGeneration: 4,
    operationId: "operation-1",
  },
  query: {
    kind: "chunk-loaded",
    dimension: "overworld",
    location: { x: 16, y: 64, z: 16 },
  },
  outcomeByState: {
    present: "ready",
    absent: "not-ready",
  },
};

describe("runtime probe bundle preparation", () => {
  it("replans blocked static probes for live runtime and compiles requests", () => {
    const result = prepareRuntimeProbeBundle({
      causalAnalysis: {
        incidents: [incident],
      },
      diagnosticProbeAnalysis: analysis,
    }, {
      availableContext: "LIVE_MINECRAFT",
      bindings: [binding],
      artifactId: "art-1",
      sessionId: "qa-run",
      runtimeTick: 100,
    });

    expect(result.issues).toEqual([]);
    expect(result.bundle).toMatchObject({
      schemaVersion: 1,
      sessionId: "qa-run",
      artifactId: "art-1",
      incidentIds: ["incident-1"],
      requests: [{
        probeId: "chunk-ready",
        predicate: "loaded-target-chunk",
        runtimeTick: 100,
        scope: {
          arenaId: "arena-1",
          arenaGeneration: 4,
          operationId: "operation-1",
        },
      }],
    });
    expect(result.incidents[0]?.plan.recommended).toHaveLength(1);
  });

  it("keeps compilation issues visible when a binding is missing", () => {
    const result = prepareRuntimeProbeBundle({
      causalAnalysis: {
        incidents: [incident],
      },
      diagnosticProbeAnalysis: analysis,
    }, {
      availableContext: "LIVE_MINECRAFT",
      bindings: [],
    });

    expect(result.bundle.requests).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        kind: "missing-binding",
        probeId: "chunk-ready",
      }),
    ]);
  });
});
