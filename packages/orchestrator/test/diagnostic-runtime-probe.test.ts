import { describe, expect, it } from "vitest";
import type { CausalIncident } from "../../project-model/src/causal-chain.js";
import type { DiagnosticProbeDefinition } from "../../project-model/src/diagnostic-probe.js";
import { createDiagnosticInvestigation } from "../src/diagnostic-investigation.js";
import { applyRuntimeProbeResponse } from "../src/diagnostic-runtime-probe.js";

const incident: CausalIncident = {
  id: "incident-1",
  scopeKey: "arena:1",
  severity: "critical",
  confidence: "medium",
  chainIds: [],
  relatedDiagnosticIds: [],
  nodes: [],
  links: [],
  rootCauseCandidates: ["chunk", "route"].map((id) => ({
    id,
    label: id,
    evidenceLevel: "unproven-candidate" as const,
    severity: "medium" as const,
    confidence: "low" as const,
    chainIds: [],
    relatedDiagnosticIds: [],
    support: {
      dependencyViolations: 0,
      evidenceGaps: 1,
      corroboratedRisks: 0,
      observedOutcomes: 0,
    },
  })),
};

const probes: DiagnosticProbeDefinition[] = [{
  id: "chunk-readiness",
  label: "chunk readiness",
  requiredContext: "LIVE_MINECRAFT",
  costUnits: 1,
  mutationRisk: "read-only",
  outcomes: [{
    id: "ready",
    observation: "chunk ready",
    rejectsCandidateIds: ["chunk"],
  }, {
    id: "not-ready",
    observation: "chunk not ready",
    supportsCandidateIds: ["chunk"],
    rejectsCandidateIds: ["route"],
  }],
}];

describe("runtime probe investigation adapter", () => {
  it("applies an explicitly mapped outcome to the investigation", () => {
    const result = applyRuntimeProbeResponse(
      createDiagnosticInvestigation(incident),
      probes,
      {
        schemaVersion: 1,
        requestId: "req-1",
        probeId: "chunk-readiness",
        runtimeTick: 100,
        ok: true,
        state: "present",
        outcomeId: "ready",
        evidence: {
          predicate: "target-chunk-loaded",
          state: "present",
          confidence: "observed",
        },
        value: true,
      },
    );

    expect(result.investigation.activeCandidateIds).toEqual(["route"]);
    expect(result.investigation.rejectedCandidateIds).toEqual(["chunk"]);
  });

  it("fails closed when no explicit outcome mapping is present", () => {
    expect(() => applyRuntimeProbeResponse(
      createDiagnosticInvestigation(incident),
      probes,
      {
        schemaVersion: 1,
        requestId: "req-2",
        probeId: "chunk-readiness",
        runtimeTick: 101,
        ok: true,
        state: "unknown",
        evidence: {
          predicate: "target-chunk-loaded",
          state: "unknown",
          confidence: "unknown",
        },
      },
    )).toThrow(/no explicit outcomeId/);
  });

  it("rejects outcomes that do not belong to the declared probe", () => {
    expect(() => applyRuntimeProbeResponse(
      createDiagnosticInvestigation(incident),
      probes,
      {
        schemaVersion: 1,
        requestId: "req-3",
        probeId: "chunk-readiness",
        runtimeTick: 102,
        ok: true,
        state: "present",
        outcomeId: "invented",
        evidence: {
          predicate: "target-chunk-loaded",
          state: "present",
          confidence: "observed",
        },
      },
    )).toThrow(/does not belong to probe/);
  });
});
