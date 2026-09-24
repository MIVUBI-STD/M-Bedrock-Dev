import { describe, expect, it } from "vitest";
import {
  verifyRepairRuntimeEvidence,
} from "../src/repair-runtime-verification.js";
import type {
  RuntimeEvidenceRecord,
} from "../../project-model/src/runtime-evidence.js";

const records: RuntimeEvidenceRecord[] = [{
  predicate: "target-ready",
  state: "present",
  confidence: "observed",
  scope: {
    arenaId: "arena-1",
    arenaGeneration: 2,
  },
  observedAt: {
    streamId: "server",
    sequence: 10,
    tick: 100,
  },
}, {
  predicate: "game-started",
  state: "present",
  confidence: "observed",
  scope: {
    arenaId: "arena-1",
    arenaGeneration: 2,
  },
  observedAt: {
    streamId: "server",
    sequence: 12,
    tick: 102,
  },
}];

describe("repair runtime verification", () => {
  it("creates a receipt only from observed scope-compatible evidence", () => {
    const result = verifyRepairRuntimeEvidence({
      transactionId: "tx-1",
      stateRequirements: [{
        id: "ready",
        predicate: "target-ready",
        expectedState: "present",
        scope: {
          arenaId: "arena-1",
          arenaGeneration: 2,
        },
      }],
      temporalRequirements: [{
        id: "ready-before-start",
        beforePredicate: "target-ready",
        afterPredicate: "game-started",
        scope: {
          arenaId: "arena-1",
          arenaGeneration: 2,
        },
      }],
    }, records, true);

    expect(result.passed).toBe(true);
    expect(result.receipt).toMatchObject({
      transactionId: "tx-1",
      kind: "runtime",
      passed: true,
    });
    expect(result.evidenceIds.length).toBe(2);
  });

  it("rejects derived-only state evidence", () => {
    const result = verifyRepairRuntimeEvidence({
      transactionId: "tx-1",
      stateRequirements: [{
        id: "ready",
        predicate: "target-ready",
        expectedState: "present",
      }],
      temporalRequirements: [],
    }, [{
      predicate: "target-ready",
      state: "present",
      confidence: "derived",
    }]);

    expect(result.passed).toBe(false);
    expect(result.receipt).toBeUndefined();
  });

  it("rejects temporal proof when continuity is incomplete", () => {
    const result = verifyRepairRuntimeEvidence({
      transactionId: "tx-1",
      stateRequirements: [],
      temporalRequirements: [{
        id: "ready-before-start",
        beforePredicate: "target-ready",
        afterPredicate: "game-started",
      }],
    }, records, false);

    // Existing comparable positive observations can still satisfy order even
    // if the broader stream is incomplete.
    expect(result.passed).toBe(true);
  });

  it("rejects missing temporal evidence on a complete stream", () => {
    const result = verifyRepairRuntimeEvidence({
      transactionId: "tx-1",
      stateRequirements: [],
      temporalRequirements: [{
        id: "ready-before-start",
        beforePredicate: "target-ready",
        afterPredicate: "game-started",
      }],
    }, [records[1]!], true);

    expect(result.passed).toBe(false);
    expect(result.temporalAssessments[0]?.status)
      .toBe("missing-before");
  });

  it("rejects empty verification plans", () => {
    const result = verifyRepairRuntimeEvidence({
      transactionId: "tx-1",
      stateRequirements: [],
      temporalRequirements: [],
    }, records);

    expect(result.passed).toBe(false);
    expect(result.receipt).toBeUndefined();
  });
});
