import { describe, expect, it } from "vitest";
import type { DiagnosticFinding } from "../../diagnostics/src/types.js";
import type { CausalIncident } from "../../project-model/src/causal-chain.js";
import type { ValidationCase } from "../../knowledge/src/validation-plan.js";
import { deriveDiagnosticProbeDefinitions } from "../src/diagnostic-probe-derivation.js";

const incident: CausalIncident = {
  id: "incident-1",
  scopeKey: "arena:1",
  severity: "medium",
  confidence: "low",
  chainIds: ["chain-1"],
  relatedDiagnosticIds: ["diag-1"],
  nodes: [],
  links: [],
  rootCauseCandidates: [{
    id: "candidate-route",
    label: "route-affecting-world-mutation",
    evidenceLevel: "unproven-candidate",
    severity: "medium",
    confidence: "low",
    chainIds: ["chain-1"],
    relatedDiagnosticIds: ["diag-1"],
    support: {
      dependencyViolations: 0,
      evidenceGaps: 1,
      corroboratedRisks: 0,
      observedOutcomes: 0,
    },
  }],
};

const finding: DiagnosticFinding = {
  id: "diag-1",
  code: "KNOWLEDGE_EVIDENCE_GAP",
  severity: "info",
  message: "route mutation requires route revalidation",
  data: {
    relationId: "route-revalidation",
    relationKind: "requires",
    subject: "route-affecting-world-mutation",
    object: "route-revalidation",
  },
};

const validation: ValidationCase = {
  id: "validate::route-revalidation::arena:1",
  relationId: "route-revalidation",
  priority: "medium",
  strategy: "runtime-invariant",
  objective: "prove route revalidation after mutation",
  expected: "route is revalidated",
  knowledgeSourceIds: [],
  evidenceSourceIds: [],
};

describe("diagnostic probe derivation", () => {
  it("derives a read-only runtime probe from an unresolved requires relation", () => {
    const probes = deriveDiagnosticProbeDefinitions(
      incident,
      [finding],
      [validation],
    );

    expect(probes).toEqual([
      expect.objectContaining({
        id: "probe::route-revalidation",
        requiredContext: "LIVE_MINECRAFT",
        mutationRisk: "read-only",
        outcomes: [
          expect.objectContaining({
            id: "present",
            rejectsCandidateIds: ["candidate-route"],
          }),
          expect.objectContaining({
            id: "absent",
            supportsCandidateIds: ["candidate-route"],
          }),
        ],
      }),
    ]);
  });

  it("uses remote context for static-proof validation", () => {
    const probes = deriveDiagnosticProbeDefinitions(
      incident,
      [finding],
      [{ ...validation, strategy: "static-proof" }],
    );
    expect(probes[0]?.requiredContext).toBe("REMOTE_GITHUB");
    expect(probes[0]?.costUnits).toBe(1);
  });

  it("does not generate a probe for diagnostics outside the incident", () => {
    expect(deriveDiagnosticProbeDefinitions(
      { ...incident, relatedDiagnosticIds: [] },
      [finding],
      [validation],
    )).toEqual([]);
  });

  it("does not re-probe an explicit relation violation as an evidence gap", () => {
    expect(deriveDiagnosticProbeDefinitions(
      incident,
      [{ ...finding, code: "KNOWLEDGE_RELATION_VIOLATION" }],
      [validation],
    )).toEqual([]);
  });
});
