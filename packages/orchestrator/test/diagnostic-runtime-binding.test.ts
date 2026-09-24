import { describe, expect, it } from "vitest";
import type { DiagnosticProbeDefinition } from "../../project-model/src/diagnostic-probe.js";
import { bindDiagnosticProbeToRuntime } from "../src/diagnostic-runtime-binding.js";

const probe: DiagnosticProbeDefinition = {
  id: "chunk-ready",
  label: "chunk readiness",
  requiredContext: "LIVE_MINECRAFT",
  costUnits: 1,
  mutationRisk: "read-only",
  outcomes: [
    { id: "ready", observation: "chunk ready" },
    { id: "not-ready", observation: "chunk not ready" },
  ],
};

describe("diagnostic runtime binding", () => {
  it("binds an abstract diagnostic probe to a concrete runtime query", () => {
    expect(bindDiagnosticProbeToRuntime(probe, {
      probeId: "chunk-ready",
      predicate: "target-chunk-loaded",
      query: {
        kind: "chunk-loaded",
        dimension: "overworld",
        location: { x: 32, y: 64, z: 48 },
      },
      outcomeByState: {
        present: "ready",
        absent: "not-ready",
      },
    })).toEqual(expect.objectContaining({
      probeId: "chunk-ready",
      predicate: "target-chunk-loaded",
      outcomeByState: {
        present: "ready",
        absent: "not-ready",
      },
    }));
  });

  it("rejects a binding for a different probe", () => {
    expect(() => bindDiagnosticProbeToRuntime(probe, {
      probeId: "route-ready",
      predicate: "route-revalidation",
      query: {
        kind: "tag-present",
        subjectKind: "entity",
        subjectId: "e1",
        tag: "route:ready",
      },
      outcomeByState: {
        present: "ready",
        absent: "not-ready",
      },
    })).toThrow(/binding targets/);
  });

  it("rejects runtime state mappings to undeclared diagnostic outcomes", () => {
    expect(() => bindDiagnosticProbeToRuntime(probe, {
      probeId: "chunk-ready",
      predicate: "target-chunk-loaded",
      query: {
        kind: "chunk-loaded",
        dimension: "overworld",
        location: { x: 0, y: 64, z: 0 },
      },
      outcomeByState: {
        present: "invented",
        absent: "not-ready",
      },
    })).toThrow(/undeclared outcome/);
  });
});
