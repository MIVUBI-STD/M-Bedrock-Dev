import { describe, expect, it } from "vitest";
import {
  buildDecisionBasis,
} from "../src/decision-basis.js";

describe("decision basis", () => {
  it("fingerprints probe bindings independently of input ordering", () => {
    const a = {
      probeId: "a",
      predicate: "a",
      query: {
        kind: "entity-resolvable" as const,
        entityId: "e1",
      },
      outcomeByState: {
        present: "yes",
        absent: "no",
      },
    };
    const b = {
      probeId: "b",
      predicate: "b",
      query: {
        kind: "tag-present" as const,
        subjectKind: "entity" as const,
        subjectId: "e1",
        tag: "ready",
      },
      outcomeByState: {
        present: "yes",
        absent: "no",
      },
    };

    expect(buildDecisionBasis({
      probeBindings: [a, b],
    }).probeBindingRevision).toBe(
      buildDecisionBasis({
        probeBindings: [b, a],
      }).probeBindingRevision,
    );
  });

  it("changes target profile fingerprint when decision context changes", () => {
    const left = buildDecisionBasis({
      target: {
        edition: "bedrock",
        version: "1.26.40",
      },
    });
    const right = buildDecisionBasis({
      target: {
        edition: "education",
        version: "1.26.40",
      },
    });

    expect(left.targetProfileFingerprint)
      .not.toBe(right.targetProfileFingerprint);
  });
  it("fingerprints runtime evidence independently of record ordering", () => {
    const a = {
      predicate: "route-ready",
      state: "present" as const,
      confidence: "observed" as const,
      origin: "telemetry" as const,
      scope: { operationId: "op-a" },
      observedAt: { tick: 10, streamId: "s", sequence: 1 },
    };
    const z = {
      predicate: "entity-stall-observed",
      state: "present" as const,
      confidence: "observed" as const,
      origin: "runtime-probe" as const,
      scope: { operationId: "op-a" },
      observedAt: { tick: 12 },
    };

    expect(buildDecisionBasis({
      runtimeEvidence: [a, z],
    }).runtimeEvidenceRevision).toBe(
      buildDecisionBasis({
        runtimeEvidence: [z, a],
      }).runtimeEvidenceRevision,
    );
  });

  it("changes runtime evidence revision when target binding changes", () => {
    const base = {
      predicate: "route-ready",
      state: "present" as const,
      confidence: "observed" as const,
      origin: "runtime-probe" as const,
      observedAt: { tick: 10 },
    };

    const left = buildDecisionBasis({
      runtimeEvidence: [{
        ...base,
        targetProfileFingerprint: "profile-a",
      }],
    });
    const right = buildDecisionBasis({
      runtimeEvidence: [{
        ...base,
        targetProfileFingerprint: "profile-b",
      }],
    });

    expect(left.runtimeEvidenceRevision)
      .not.toBe(right.runtimeEvidenceRevision);
  });

  it("changes runtime evidence revision when observed state or integrity changes", () => {
    const base = {
      predicate: "route-ready",
      state: "present" as const,
      confidence: "observed" as const,
      origin: "telemetry" as const,
      scope: { operationId: "op-a" },
      observedAt: { tick: 10 },
    };

    const left = buildDecisionBasis({
      runtimeEvidence: [base],
      evidenceIntegrity: {
        telemetry: {
          records: 1,
          observedRecords: 1,
          derivedRecords: 0,
          unknownConfidenceRecords: 0,
          unlocatedObservedRecords: 0,
          unresolvedConflictPredicates: [],
          resolvedConflictCount: 0,
          continuityComplete: true,
          telemetryContinuityComplete: true,
          safeForCurrentStateClaims: true,
          safeForTemporalViolationClaims: true,
          reasons: ["healthy"],
        },
      },
    });

    const changedState = buildDecisionBasis({
      runtimeEvidence: [{ ...base, state: "absent" as const }],
      evidenceIntegrity: {
        telemetry: {
          records: 1,
          observedRecords: 1,
          derivedRecords: 0,
          unknownConfidenceRecords: 0,
          unlocatedObservedRecords: 0,
          unresolvedConflictPredicates: [],
          resolvedConflictCount: 0,
          continuityComplete: true,
          telemetryContinuityComplete: true,
          safeForCurrentStateClaims: true,
          safeForTemporalViolationClaims: true,
          reasons: ["healthy"],
        },
      },
    });

    const changedIntegrity = buildDecisionBasis({
      runtimeEvidence: [base],
      evidenceIntegrity: {
        telemetry: {
          records: 1,
          observedRecords: 1,
          derivedRecords: 0,
          unknownConfidenceRecords: 0,
          unlocatedObservedRecords: 1,
          unresolvedConflictPredicates: [],
          resolvedConflictCount: 0,
          continuityComplete: true,
          telemetryContinuityComplete: true,
          safeForCurrentStateClaims: true,
          safeForTemporalViolationClaims: false,
          reasons: ["missing temporal point"],
        },
      },
    });

    expect(left.runtimeEvidenceRevision)
      .not.toBe(changedState.runtimeEvidenceRevision);
    expect(left.runtimeEvidenceRevision)
      .not.toBe(changedIntegrity.runtimeEvidenceRevision);
  });
  it("ignores explanatory note and integrity reason wording in evidence revision", () => {
    const record = {
      predicate: "route-ready",
      state: "present" as const,
      confidence: "observed" as const,
      origin: "telemetry" as const,
      scope: { operationId: "op-a" },
      observedAt: { tick: 10 },
    };

    const commonIntegrity = {
      records: 1,
      observedRecords: 1,
      derivedRecords: 0,
      unknownConfidenceRecords: 0,
      unlocatedObservedRecords: 0,
      unresolvedConflictPredicates: [] as string[],
      resolvedConflictCount: 0,
      continuityComplete: true,
      telemetryContinuityComplete: true,
      safeForCurrentStateClaims: true,
      safeForTemporalViolationClaims: true,
    };

    const left = buildDecisionBasis({
      runtimeEvidence: [{
        ...record,
        note: "first human explanation",
      }],
      evidenceIntegrity: {
        telemetry: {
          ...commonIntegrity,
          reasons: ["wording one"],
        },
      },
    });

    const right = buildDecisionBasis({
      runtimeEvidence: [{
        ...record,
        note: "different human explanation",
      }],
      evidenceIntegrity: {
        telemetry: {
          ...commonIntegrity,
          reasons: ["wording two"],
        },
      },
    });

    expect(left.runtimeEvidenceRevision)
      .toBe(right.runtimeEvidenceRevision);
  });

  it("always binds the canonical contract registry revision", () => {
    const basis = buildDecisionBasis({});
    expect(basis.contractRegistryRevision)
      .toMatch(/^[a-f0-9]{64}$/);
  });

});
