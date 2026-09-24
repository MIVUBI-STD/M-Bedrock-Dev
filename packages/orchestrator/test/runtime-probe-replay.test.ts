import { describe, expect, it } from "vitest";
import type { CausalIncident } from "../../project-model/src/causal-chain.js";
import type { DiagnosticProbeDefinition } from "../../project-model/src/diagnostic-probe.js";
import type {
  RuntimeProbeExchange,
  RuntimeProbeTranscript,
} from "../../project-model/src/runtime-probe.js";
import { replayRuntimeProbeTranscript } from "../src/runtime-probe-replay.js";

function incident(): CausalIncident {
  return {
    id: "incident-1",
    scopeKey: "operation-1",
    severity: "critical",
    confidence: "medium",
    chainIds: [],
    relatedDiagnosticIds: [],
    nodes: [],
    links: [],
    rootCauseCandidates: [{
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
    }, {
      id: "route",
      label: "route-invalid",
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
}

const probes: DiagnosticProbeDefinition[] = [{
  id: "chunk-ready",
  label: "Observe chunk readiness",
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
}, {
  id: "route-valid",
  label: "Observe route validity",
  requiredContext: "LIVE_MINECRAFT",
  costUnits: 1,
  mutationRisk: "read-only",
  outcomes: [{
    id: "valid",
    observation: "route valid",
    rejectsCandidateIds: ["route"],
  }, {
    id: "invalid",
    observation: "route invalid",
    supportsCandidateIds: ["route"],
  }],
}];

function exchange(input: {
  requestId: string;
  probeId: string;
  state: "present" | "absent" | "unknown";
  outcomeId?: string;
  ok?: boolean;
}): RuntimeProbeExchange {
  const ok = input.ok ?? true;
  const outcomeByState =
    input.probeId === "chunk-ready"
      ? {
          present: "ready",
          absent: "not-ready",
          unknown: "unknown",
        }
      : {
          present: "valid",
          absent: "invalid",
          unknown: "unknown",
        };

  return {
    request: {
      schemaVersion: 1,
      requestId: input.requestId,
      probeId: input.probeId,
      predicate: input.probeId,
      runtimeTick: 90,
      query: {
        kind: "tag-present",
        subjectKind: "entity",
        subjectId: "entity-1",
        tag: input.probeId,
      },
      outcomeByState,
    },
    response: {
      schemaVersion: 1,
      requestId: input.requestId,
      probeId: input.probeId,
      runtimeTick: 100,
      ok,
      state: input.state,
      ...(input.outcomeId === undefined
        ? {}
        : { outcomeId: input.outcomeId }),
      evidence: {
        predicate: input.probeId,
        state: input.state,
        confidence: ok ? "observed" : "unknown",
        observedAt: { tick: 100 },
      },
      ...(ok ? {} : { error: "probe backend unavailable" }),
    },
  };
}

describe("adaptive runtime probe transcript replay", () => {
  it("rejects a candidate and plans only remaining unanswered probes", () => {
    const transcript: RuntimeProbeTranscript = {
      schemaVersion: 1,
      exchanges: [exchange({
        requestId: "req-1",
        probeId: "chunk-ready",
        state: "present",
        outcomeId: "ready",
      })],
    };

    const result = replayRuntimeProbeTranscript(
      incident(),
      probes,
      transcript,
      { availableContext: "LIVE_MINECRAFT" },
    );

    expect(result.successfulProbeIds).toEqual(["chunk-ready"]);
    expect(result.incident.rootCauseCandidates.map((item) => item.id))
      .toEqual(["route"]);
    expect(result.nextPlan.recommended.map((item) => item.probeId))
      .toEqual(["route-valid"]);
    expect(result.failed).toEqual([]);
  });

  it("keeps failed probes from changing candidates and allows them to be retried", () => {
    const transcript: RuntimeProbeTranscript = {
      schemaVersion: 1,
      exchanges: [exchange({
        requestId: "req-1",
        probeId: "chunk-ready",
        state: "unknown",
        ok: false,
      })],
    };

    const result = replayRuntimeProbeTranscript(
      incident(),
      probes,
      transcript,
      { availableContext: "LIVE_MINECRAFT" },
    );

    expect(result.successfulProbeIds).toEqual([]);
    expect(result.incident.rootCauseCandidates.map((item) => item.id).sort())
      .toEqual(["chunk", "route"]);
    expect(result.nextPlan.recommended.map((item) => item.probeId))
      .toContain("chunk-ready");
    expect(result.failed).toEqual([
      expect.objectContaining({
        requestId: "req-1",
        probeId: "chunk-ready",
      }),
    ]);
    expect(result.evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({
        state: "unknown",
        confidence: "unknown",
      }),
    ]));
  });

  it("reports candidate-set-exhausted when evidence rejects the final candidate", () => {
    const singleIncident: CausalIncident = {
      ...incident(),
      rootCauseCandidates: [incident().rootCauseCandidates[0]!],
    };

    const transcript: RuntimeProbeTranscript = {
      schemaVersion: 1,
      exchanges: [exchange({
        requestId: "req-1",
        probeId: "chunk-ready",
        state: "present",
        outcomeId: "ready",
      })],
    };

    const result = replayRuntimeProbeTranscript(
      singleIncident,
      [probes[0]!],
      transcript,
      { availableContext: "LIVE_MINECRAFT" },
    );

    expect(result.incident.rootCauseCandidates).toEqual([]);
    expect(result.nextPlan.stopCondition).toBe("candidate-set-exhausted");
  });

  it("marks replay incomplete when the transcript dropped earlier exchanges", () => {
    const transcript: RuntimeProbeTranscript = {
      schemaVersion: 1,
      droppedExchanges: 2,
      exchanges: [exchange({
        requestId: "req-1",
        probeId: "chunk-ready",
        state: "present",
        outcomeId: "ready",
      })],
    };

    const result = replayRuntimeProbeTranscript(
      incident(),
      probes,
      transcript,
      { availableContext: "LIVE_MINECRAFT" },
    );

    expect(result.transcriptIncomplete).toBe(true);
    expect(result.droppedExchanges).toBe(2);
  });
});
