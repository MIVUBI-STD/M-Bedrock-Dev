import { describe, expect, it } from "vitest";
import type { CausalChain } from "../../project-model/src/causal-chain.js";
import { synthesizeCausalIncidents } from "../src/causal-incident-analysis.js";

function chain(input: {
  id: string;
  subject: string;
  severity: "info" | "minor" | "medium" | "critical";
  confidence: "low" | "medium" | "high";
  violation?: boolean;
  corroborated?: boolean;
  observedOutcome?: boolean;
}): CausalChain {
  const subjectId = input.id + ":subject";
  const statusId = input.id + ":status";
  const riskId = input.id + ":risk";
  const observedId = input.id + ":observed";
  const nodes: CausalChain["nodes"] = [
    {
      id: subjectId,
      kind: "observed-state",
      label: input.subject,
      diagnosticIds: [input.id + ":diag"],
    },
    {
      id: statusId,
      kind: input.violation ? "violation" : "evidence-gap",
      label: input.violation ? "violation" : "gap",
      diagnosticIds: [input.id + ":diag"],
    },
    {
      id: riskId,
      kind: "downstream-risk",
      label: input.subject + "-risk",
      diagnosticIds: [input.id + ":diag"],
    },
    ...(input.observedOutcome ? [{
      id: observedId,
      kind: "observed-state" as const,
      label: input.subject + "-observed",
      diagnosticIds: [input.id + ":diag"],
    }] : []),
  ];

  const links: CausalChain["links"] = [
    {
      from: subjectId,
      to: statusId,
      strength: input.violation ? "direct-evidence" : "dependency-supported",
      rationale: "fixture",
    },
    {
      from: statusId,
      to: riskId,
      strength: input.corroborated ? "corroborated-risk" : "risk-only",
      rationale: "fixture",
    },
    ...(input.observedOutcome ? [{
      from: riskId,
      to: observedId,
      strength: "direct-evidence" as const,
      rationale: "fixture",
    }] : []),
  ];

  return {
    id: input.id,
    scopeKey: "arena:1",
    severity: input.severity,
    confidence: input.confidence,
    title: input.subject,
    summary: "fixture",
    nodes,
    links,
    relatedDiagnosticIds: [input.id + ":diag"],
  };
}

describe("causal incident synthesis", () => {
  it("groups chains by scope and ranks evidence quality before severity", () => {
    const incidents = synthesizeCausalIncidents([
      chain({
        id: "weak",
        subject: "route-mutation",
        severity: "critical",
        confidence: "low",
      }),
      chain({
        id: "strong",
        subject: "missing-structure-target",
        severity: "medium",
        confidence: "high",
        violation: true,
        observedOutcome: true,
      }),
      chain({
        id: "corroborated",
        subject: "state-drift",
        severity: "medium",
        confidence: "medium",
        corroborated: true,
      }),
    ]);

    expect(incidents).toHaveLength(1);
    const incident = incidents[0]!;
    expect(incident.chainIds).toHaveLength(3);
    expect(incident.rootCauseCandidates.map((item) => item.label)).toEqual([
      "missing-structure-target",
      "state-drift",
      "route-mutation",
    ]);
    expect(incident.rootCauseCandidates[0]?.evidenceLevel)
      .toBe("proven-with-observed-outcome");
    expect(incident.rootCauseCandidates[1]?.evidenceLevel)
      .toBe("corroborated-candidate");
    expect(incident.rootCauseCandidates[2]?.evidenceLevel)
      .toBe("unproven-candidate");
  });

  it("does not merge unrelated scopes into one incident", () => {
    const a = chain({
      id: "a",
      subject: "route-a",
      severity: "medium",
      confidence: "low",
    });
    const b = {
      ...chain({
        id: "b",
        subject: "route-b",
        severity: "medium",
        confidence: "low",
      }),
      scopeKey: "arena:2",
    };

    expect(synthesizeCausalIncidents([a, b])).toHaveLength(2);
  });

  it("merges repeated candidate labels while preserving support counts", () => {
    const first = chain({
      id: "a",
      subject: "route-mutation",
      severity: "medium",
      confidence: "medium",
      corroborated: true,
    });
    const second = chain({
      id: "b",
      subject: "route-mutation",
      severity: "critical",
      confidence: "high",
      violation: true,
    });

    const incident = synthesizeCausalIncidents([first, second])[0]!;
    expect(incident.rootCauseCandidates).toHaveLength(1);
    expect(incident.rootCauseCandidates[0]).toEqual(expect.objectContaining({
      label: "route-mutation",
      evidenceLevel: "proven-dependency-violation",
      severity: "critical",
      confidence: "high",
      support: expect.objectContaining({
        dependencyViolations: 1,
        corroboratedRisks: 1,
      }),
    }));
  });
});
