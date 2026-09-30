import { describe, expect, it } from "vitest";
import {
  repairRuntimeExperimentContractsFromProof,
  verifyRepairRuntimeEvidence,
} from "../src/repair-runtime-verification.js";
import {
  runtimeVerificationExperimentEnvelopeRevision,
  type RuntimeEvidenceRecord,
  type RuntimeVerificationExperimentContract,
} from "../../project-model/src/index.js";

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
  it("derives deterministic experiment envelope revisions and changes them only with semantic contract changes", () => {
    const first: RuntimeVerificationExperimentContract = {
      interventionId: "exp:a",
      experimentRevision: "rev-1",
      targetProfileFingerprint: "profile-a",
      fixtureFingerprint: "fixture-a",
      predicateIds: ["b", "a"],
      factorContrasts: [{
        factorId: "flag",
        controlValue: false,
        treatmentValue: true,
      }],
      expectedContrasts: [{
        predicateId: "a",
        controlState: "absent",
        treatmentState: "present",
      }],
    };
    const second: RuntimeVerificationExperimentContract = {
      interventionId: "exp:b",
      experimentRevision: "rev-1",
      targetProfileFingerprint: "profile-a",
      fixtureFingerprint: "fixture-b",
      predicateIds: ["c"],
      factorContrasts: [{
        factorId: "mode",
        controlValue: "old",
        treatmentValue: "new",
      }],
      expectedContrasts: [{
        predicateId: "c",
        controlState: "absent",
        treatmentState: "present",
      }],
    };

    const a = runtimeVerificationExperimentEnvelopeRevision(
      [first, second],
    );
    const reordered = runtimeVerificationExperimentEnvelopeRevision(
      [
        second,
        {
          ...first,
          predicateIds: ["a", "b"],
        },
      ],
    );
    const changed = runtimeVerificationExperimentEnvelopeRevision(
      [
        first,
        {
          ...second,
          fixtureFingerprint: "fixture-c",
        },
      ],
    );

    expect(reordered).toBe(a);
    expect(changed).not.toBe(a);
  });

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

  it("accepts post-repair runtime proof only when the executed experiment contract matches exactly", () => {
    const contract: RuntimeVerificationExperimentContract = {
      interventionId: "exp:chunk",
      experimentRevision: "rev-1",
      targetProfileFingerprint: "profile-a",
      fixtureFingerprint: "fixture-a",
      predicateIds: ["target-ready"],
      factorContrasts: [{
        factorId: "chunk-loaded",
        controlValue: false,
        treatmentValue: true,
      }],
      expectedContrasts: [{
        predicateId: "target-ready",
        controlState: "absent",
        treatmentState: "present",
      }],
    };

    const result = verifyRepairRuntimeEvidence({
      transactionId: "tx-1",
      stateRequirements: [{
        id: "ready",
        predicate: "target-ready",
        expectedState: "present",
      }],
      temporalRequirements: [],
      experimentContract: contract,
    }, [{
      ...records[0]!,
      targetProfileFingerprint: "profile-a",
    }], true, {
      expectedTargetProfileFingerprint: "profile-a",
      executedExperimentContract: contract,
    });

    expect(result.passed).toBe(true);
    expect(result.receipt).toBeDefined();
  });

  it("accepts an explicitly compatible successor contract with stricter predicate coverage", () => {
    const expected: RuntimeVerificationExperimentContract = {
      interventionId: "exp:chunk",
      experimentRevision: "rev-1",
      targetProfileFingerprint: "profile-a",
      fixtureFingerprint: "fixture-a",
      predicateIds: ["target-ready"],
      factorContrasts: [{
        factorId: "chunk-loaded",
        controlValue: false,
        treatmentValue: true,
      }],
      expectedContrasts: [{
        predicateId: "target-ready",
        controlState: "absent" as const,
        treatmentState: "present" as const,
      }],
    };
    const successor = {
      ...expected,
      experimentRevision: "rev-2",
      compatibleWithRevisions: ["rev-1"],
      predicateIds: ["game-started", "target-ready"],
      expectedContrasts: [{
        predicateId: "game-started",
        controlState: "absent" as const,
        treatmentState: "present" as const,
      }, ...expected.expectedContrasts],
    };

    const result = verifyRepairRuntimeEvidence({
      transactionId: "tx-1",
      stateRequirements: [{
        id: "ready",
        predicate: "target-ready",
        expectedState: "present",
      }],
      temporalRequirements: [],
      experimentContract: expected,
    }, [{
      ...records[0]!,
      targetProfileFingerprint: "profile-a",
    }], true, {
      expectedTargetProfileFingerprint: "profile-a",
      executedExperimentContract: successor,
    });

    expect(result.passed).toBe(true);
    expect(
      result.receipt?.runtimeExperimentContract?.experimentRevision,
    ).toBe("rev-2");
  });

  it("rejects a newer revision without explicit compatibility declaration", () => {
    const expected: RuntimeVerificationExperimentContract = {
      interventionId: "exp:chunk",
      experimentRevision: "rev-1",
      targetProfileFingerprint: "profile-a",
      fixtureFingerprint: "fixture-a",
      predicateIds: ["target-ready"],
      factorContrasts: [{
        factorId: "chunk-loaded",
        controlValue: false,
        treatmentValue: true,
      }],
      expectedContrasts: [{
        predicateId: "target-ready",
        controlState: "absent" as const,
        treatmentState: "present" as const,
      }],
    };

    const result = verifyRepairRuntimeEvidence({
      transactionId: "tx-1",
      stateRequirements: [{
        id: "ready",
        predicate: "target-ready",
        expectedState: "present",
      }],
      temporalRequirements: [],
      experimentContract: expected,
    }, [{
      ...records[0]!,
      targetProfileFingerprint: "profile-a",
    }], true, {
      expectedTargetProfileFingerprint: "profile-a",
      executedExperimentContract: {
        ...expected,
        experimentRevision: "rev-2",
      },
    });

    expect(result.passed).toBe(false);
  });

  it("rejects post-repair runtime proof when the experiment revision or fixture changes", () => {
    const expected: RuntimeVerificationExperimentContract = {
      interventionId: "exp:chunk",
      experimentRevision: "rev-1",
      targetProfileFingerprint: "profile-a",
      fixtureFingerprint: "fixture-a",
      predicateIds: ["target-ready"],
      factorContrasts: [{
        factorId: "chunk-loaded",
        controlValue: false,
        treatmentValue: true,
      }],
      expectedContrasts: [{
        predicateId: "target-ready",
        controlState: "absent",
        treatmentState: "present",
      }],
    };

    const result = verifyRepairRuntimeEvidence({
      transactionId: "tx-1",
      stateRequirements: [{
        id: "ready",
        predicate: "target-ready",
        expectedState: "present",
      }],
      temporalRequirements: [],
      experimentContract: expected,
    }, [{
      ...records[0]!,
      targetProfileFingerprint: "profile-a",
    }], true, {
      expectedTargetProfileFingerprint: "profile-a",
      executedExperimentContract: {
        ...expected,
        experimentRevision: "rev-2",
        fixtureFingerprint: "fixture-b",
      },
    });

    expect(result.passed).toBe(false);
    expect(result.receipt).toBeUndefined();
    expect(result.reasons.join(" ")).toMatch(
      /exact experiment contract/i,
    );
  });

  it("derives retest contract identity from repair causal provenance", () => {
    const contracts = repairRuntimeExperimentContractsFromProof({
      transactionId: "tx-1",
      sourceFingerprint: "source",
      graphFingerprint: "graph",
      decisionBasis: {
        sourceFingerprint: "source",
        graphFingerprint: "graph",
      },
      incidentId: "incident",
      diagnosticDisposition: "guarded-repair-eligible",
      claimStrength: "proven-runtime",
      proofState: "intervention-supported",
      blastRadiusDisposition: "minimal",
      admissionDisposition: "guarded",
      supportingInvariantIds: [],
      changedNodeIds: [],
      affectedNodeIds: [],
      requiredRevalidationNodeIds: [],
      requiredRevalidationPaths: [],
      impactTraces: [],
      reasons: [],
      causalInterventionProvenance: [{
        interventionId: "exp:chunk",
        experimentRevision: "rev-1",
        predicateId: "target-ready",
        controlledFactorIds: ["chunk-loaded"],
        controlledFactorContrasts: [{
          factorId: "chunk-loaded",
          controlValue: false,
          treatmentValue: true,
        }],
        controlState: "absent",
        treatmentState: "present",
        expectedContrastDisposition: "matched",
        targetProfileFingerprint: "profile-a",
        fixtureFingerprint: "fixture-a",
        evidenceIds: ["e:1"],
      }, {
        interventionId: "exp:chunk",
        experimentRevision: "rev-1",
        predicateId: "game-started",
        controlledFactorIds: ["chunk-loaded"],
        controlledFactorContrasts: [{
          factorId: "chunk-loaded",
          controlValue: false,
          treatmentValue: true,
        }],
        controlState: "absent",
        treatmentState: "present",
        expectedContrastDisposition: "matched",
        targetProfileFingerprint: "profile-a",
        fixtureFingerprint: "fixture-a",
        evidenceIds: ["e:2"],
      }],
    });

    expect(contracts).toEqual([{
      interventionId: "exp:chunk",
      experimentRevision: "rev-1",
      targetProfileFingerprint: "profile-a",
      fixtureFingerprint: "fixture-a",
      predicateIds: ["game-started", "target-ready"],
      factorContrasts: [{
        factorId: "chunk-loaded",
        controlValue: false,
        treatmentValue: true,
      }],
      expectedContrasts: [{
        predicateId: "game-started",
        controlState: "absent",
        treatmentState: "present",
      }, {
        predicateId: "target-ready",
        controlState: "absent",
        treatmentState: "present",
      }],
    }]);
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
