import { describe, expect, it } from "vitest";
import type { RuntimeEvidenceRecord } from "../../project-model/src/index.js";
import { assessRuntimeEvidenceIntegrity } from "../src/runtime-evidence-integrity.js";

const observed: RuntimeEvidenceRecord = {
  predicate: "route-ready",
  state: "present",
  confidence: "observed",
  observedAt: { streamId: "s1", sequence: 1, tick: 10 },
};

describe("runtime evidence integrity", () => {
  it("allows current-state and temporal claims for clean continuous evidence", () => {
    const report = assessRuntimeEvidenceIntegrity(
      [observed],
      {
        map: {},
        conflicts: [],
        resolvedConflicts: [],
        sourceRefs: [],
        relatedNodeIds: [],
      },
      {
        events: 1,
        sequencedEvents: 1,
        unsequencedEvents: 0,
        unidentifiedStreamEvents: 0,
        streams: [],
        missingSequences: 0,
        duplicateSequences: 0,
        nonMonotonicTransitions: 0,
        droppedEvents: 0,
        incomplete: false,
      },
    );

    expect(report.safeForCurrentStateClaims).toBe(true);
    expect(report.safeForTemporalViolationClaims).toBe(true);
  });

  it("blocks current-state claims when conflicts remain unresolved", () => {
    const report = assessRuntimeEvidenceIntegrity(
      [observed],
      {
        map: {},
        conflicts: ["route-ready"],
        resolvedConflicts: [],
        sourceRefs: [],
        relatedNodeIds: [],
      },
    );

    expect(report.safeForCurrentStateClaims).toBe(false);
    expect(report.safeForTemporalViolationClaims).toBe(false);
  });

  it("allows current-state claims but blocks temporal absence claims when continuity is incomplete", () => {
    const report = assessRuntimeEvidenceIntegrity(
      [observed],
      {
        map: {},
        conflicts: [],
        resolvedConflicts: [],
        sourceRefs: [],
        relatedNodeIds: [],
      },
      {
        events: 2,
        sequencedEvents: 2,
        unsequencedEvents: 0,
        unidentifiedStreamEvents: 0,
        streams: [],
        missingSequences: 1,
        duplicateSequences: 0,
        nonMonotonicTransitions: 0,
        droppedEvents: 0,
        incomplete: true,
      },
    );

    expect(report.safeForCurrentStateClaims).toBe(true);
    expect(report.safeForTemporalViolationClaims).toBe(false);
  });

  it("blocks temporal claims for observed records without observation points", () => {
    const report = assessRuntimeEvidenceIntegrity(
      [{
        predicate: observed.predicate,
        state: observed.state,
        confidence: observed.confidence,
      }],
      {
        map: {},
        conflicts: [],
        resolvedConflicts: [],
        sourceRefs: [],
        relatedNodeIds: [],
      },
    );

    expect(report.unlocatedObservedRecords).toBe(1);
    expect(report.safeForTemporalViolationClaims).toBe(false);
  });
  it("aggregates integrity per scope without cross-scope false conflicts", async () => {
    const { assessRuntimeEvidenceSetIntegrity } = await import(
      "../src/runtime-evidence-integrity.js"
    );

    const report = assessRuntimeEvidenceSetIntegrity([
      {
        predicate: "route-ready",
        state: "present",
        confidence: "observed",
        scope: { operationId: "op-a" },
        observedAt: { tick: 10 },
      },
      {
        predicate: "route-ready",
        state: "absent",
        confidence: "observed",
        scope: { operationId: "op-b" },
        observedAt: { tick: 10 },
      },
    ]);

    expect(report.unresolvedConflictPredicates).toEqual([]);
    expect(report.safeForCurrentStateClaims).toBe(true);
    expect(report.safeForTemporalViolationClaims).toBe(true);
  });
});
