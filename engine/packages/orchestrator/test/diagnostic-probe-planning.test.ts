import { describe, expect, it } from "vitest";
import type { CausalIncident } from "../../project-model/src/index.js";
import type { DiagnosticProbeDefinition } from "../../project-model/src/index.js";
import { planDiagnosticProbes } from "../src/diagnostic-probe-planning.js";

function incident(): CausalIncident {
  return {
    id: "incident-1",
    scopeKey: "arena:1",
    severity: "critical",
    confidence: "medium",
    chainIds: [],
    relatedDiagnosticIds: [],
    nodes: [],
    links: [],
    rootCauseCandidates: [
      {
        id: "chunk",
        label: "chunk-not-ready",
        evidenceLevel: "unproven-candidate",
        severity: "critical",
        confidence: "medium",
        chainIds: [],
        relatedDiagnosticIds: [],
        support: {
          dependencyViolations: 0,
          evidenceGaps: 1,
          corroboratedRisks: 0,
          observedOutcomes: 0,
        },
      },
      {
        id: "route",
        label: "route-invalid",
        evidenceLevel: "corroborated-candidate",
        severity: "critical",
        confidence: "medium",
        chainIds: [],
        relatedDiagnosticIds: [],
        support: {
          dependencyViolations: 0,
          evidenceGaps: 1,
          corroboratedRisks: 1,
          observedOutcomes: 0,
        },
      },
      {
        id: "state",
        label: "stale-state",
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
      },
    ],
  };
}

const probes: DiagnosticProbeDefinition[] = [
  {
    id: "chunk-readiness",
    label: "Observe target chunk readiness",
    requiredContext: "LIVE_MINECRAFT",
    costUnits: 1,
    mutationRisk: "read-only",
    outcomes: [
      {
        id: "not-ready",
        observation: "target chunk is not script-valid loaded",
        supportsCandidateIds: ["chunk"],
        rejectsCandidateIds: ["route", "state"],
      },
      {
        id: "ready",
        observation: "target chunk is script-valid loaded",
        rejectsCandidateIds: ["chunk"],
      },
    ],
  },
  {
    id: "route-proof",
    label: "Revalidate route after mutation",
    requiredContext: "LOCAL_ARTIFACT",
    costUnits: 2,
    mutationRisk: "read-only",
    outcomes: [
      {
        id: "invalid",
        observation: "route corridor is invalid",
        supportsCandidateIds: ["route"],
        rejectsCandidateIds: ["chunk", "state"],
      },
      {
        id: "valid",
        observation: "route corridor remains valid",
        rejectsCandidateIds: ["route"],
      },
    ],
  },
  {
    id: "broad-reset",
    label: "Reset arena and retry",
    requiredContext: "LIVE_MINECRAFT",
    costUnits: 5,
    mutationRisk: "mutating",
    outcomes: [
      {
        id: "changed",
        observation: "symptom changes after reset",
        supportsCandidateIds: ["chunk", "route", "state"],
      },
    ],
  },
];

describe("diagnostic probe planning", () => {
  it("prefers high-discrimination low-cost evidence over broad mutation", () => {
    const plan = planDiagnosticProbes(incident(), probes, "LIVE_MINECRAFT");
    expect(plan.recommended[0]?.probeId).toBe("chunk-readiness");
    expect(plan.recommended.at(-1)?.probeId).toBe("broad-reset");
  });

  it("separates probes that require a stronger execution context", () => {
    const plan = planDiagnosticProbes(incident(), probes, "LOCAL_ARTIFACT");
    expect(plan.recommended.map((item) => item.probeId)).toContain("route-proof");
    expect(plan.blockedByContext.map((item) => item.probeId)).toEqual(
      expect.arrayContaining(["chunk-readiness", "broad-reset"]),
    );
  });

  it("does not mistake legacy observed outcome for causal proof", () => {
    const base = incident();
    const input: CausalIncident = {
      ...base,
      rootCauseCandidates: [{
        ...base.rootCauseCandidates[0]!,
        evidenceLevel: "proven-with-observed-outcome",
      }],
    };
    const plan = planDiagnosticProbes(input, probes, "LIVE_MINECRAFT");
    expect(plan.unresolvedCandidateIds).toEqual(["chunk"]);
    expect(plan.recommended.length).toBeGreaterThan(0);
  });

  it("stops requesting evidence only after explicit causal proof", () => {
    const base = incident();
    const input: CausalIncident = {
      ...base,
      rootCauseCandidates: [{
        ...base.rootCauseCandidates[0]!,
        evidenceLevel: "proven-with-observed-outcome",
        proof: { state: "causal" },
      }],
    };
    const plan = planDiagnosticProbes(input, probes, "LIVE_MINECRAFT");
    expect(plan.recommended).toEqual([]);
    expect(plan.stopCondition).toBe("no-probe-required");
  });
});
