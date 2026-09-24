import { describe, expect, it } from "vitest";
import type { DiagnosticFinding } from "../../diagnostics/src/index.js";
import type { CausalIncident } from "../../project-model/src/causal-chain.js";
import type { RuntimeProbeBinding } from "../../project-model/src/runtime-probe.js";
import type { ValidationCase } from "../../knowledge/src/index.js";
import {
  analyzeDiagnosticProbes,
  prepareRuntimeProbes,
} from "../src/diagnostic-probe-analysis.js";

const incident: CausalIncident = {
  id: "incident-1",
  scopeKey: "mutation-1",
  severity: "medium",
  confidence: "low",
  chainIds: ["chain-1"],
  relatedDiagnosticIds: ["diag-1"],
  nodes: [],
  links: [],
  rootCauseCandidates: [{
    id: "candidate-1",
    label: "block-write",
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
  message: "block-write requires loaded-target-chunk",
  data: {
    relationId: "block-write-needs-loaded-chunk",
    relationKind: "requires",
    subject: "block-write",
    object: "loaded-target-chunk",
  },
};

const validation: ValidationCase = {
  id: "validation-1",
  relationId: "block-write-needs-loaded-chunk",
  priority: "medium",
  strategy: "runtime-invariant",
  objective: "observe target chunk readiness",
  expected: "target chunk readiness becomes known",
  knowledgeSourceIds: [],
  evidenceSourceIds: [],
};

const binding: RuntimeProbeBinding = {
  probeId: "probe::block-write-needs-loaded-chunk",
  predicate: "loaded-target-chunk",
  incidentId: "incident-1",
  scope: {
    arenaId: "arena-1",
    arenaGeneration: 4,
    operationId: "mutation-1",
  },
  query: {
    kind: "chunk-loaded",
    dimension: "overworld",
    location: { x: 16, y: 64, z: 16 },
  },
  outcomeByState: {
    present: "present",
    absent: "absent",
  },
};

describe("diagnostic probe analysis", () => {
  it("builds incident probe definitions and context-aware plans", () => {
    const local = analyzeDiagnosticProbes(
      [incident],
      [finding],
      [validation],
      "LOCAL_ARTIFACT",
    );

    expect(local.definitions).toBe(1);
    expect(local.recommended).toBe(0);
    expect(local.blockedByContext).toBe(1);
    expect(local.incidents[0]?.plan.blockedByContext[0]?.probeId)
      .toBe("probe::block-write-needs-loaded-chunk");

    const live = analyzeDiagnosticProbes(
      [incident],
      [finding],
      [validation],
      "LIVE_MINECRAFT",
    );
    expect(live.recommended).toBe(1);
    expect(live.blockedByContext).toBe(0);
  });

  it("prepares executable requests only when explicit bindings are supplied", () => {
    const live = analyzeDiagnosticProbes(
      [incident],
      [finding],
      [validation],
      "LIVE_MINECRAFT",
    );

    const missing = prepareRuntimeProbes(live, []);
    expect(missing.requests).toEqual([]);
    expect(missing.issues).toEqual([
      expect.objectContaining({
        kind: "missing-binding",
        probeId: "probe::block-write-needs-loaded-chunk",
      }),
    ]);

    const prepared = prepareRuntimeProbes(
      live,
      [binding],
      { runtimeTick: 100 },
    );

    expect(prepared.issues).toEqual([]);
    expect(prepared.requests).toEqual([
      expect.objectContaining({
        probeId: "probe::block-write-needs-loaded-chunk",
        predicate: "loaded-target-chunk",
        runtimeTick: 100,
        scope: {
          arenaId: "arena-1",
          arenaGeneration: 4,
          operationId: "mutation-1",
        },
        query: expect.objectContaining({
          kind: "chunk-loaded",
        }),
      }),
    ]);
  });
});
