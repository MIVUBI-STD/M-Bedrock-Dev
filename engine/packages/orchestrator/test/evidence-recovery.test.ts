import { describe, expect, it } from "vitest";
import type { RuntimeEvidenceIntegrityReport } from "../../project-model/src/index.js";
import { planEvidenceRecovery } from "../src/evidence-recovery.js";

function integrity(
  overrides: Partial<RuntimeEvidenceIntegrityReport> = {},
): RuntimeEvidenceIntegrityReport {
  return {
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
    reasons: [
      "No evidence-integrity blocker is detected for the assessed claim classes.",
    ],
    ...overrides,
  };
}

describe("evidence recovery planning", () => {
  it("requires no recovery for healthy evidence channels", () => {
    expect(planEvidenceRecovery(
      integrity(),
      integrity(),
    )).toEqual({
      required: false,
      actions: [],
      blocksCurrentStateClaims: false,
      blocksTemporalClaims: false,
      blocksFullRepairAuthorization: false,
    });
  });

  it("requests telemetry recapture for missing temporal location and continuity", () => {
    const plan = planEvidenceRecovery(
      integrity({
        unlocatedObservedRecords: 2,
        continuityComplete: false,
        telemetryContinuityComplete: false,
        safeForTemporalViolationClaims: false,
      }),
      integrity(),
    );

    expect(plan.required).toBe(true);
    expect(plan.blocksCurrentStateClaims).toBe(false);
    expect(plan.blocksTemporalClaims).toBe(true);
    expect(plan.blocksFullRepairAuthorization).toBe(true);
    expect(plan.actions.map((item) => item.kind)).toEqual([
      "recapture-continuous-stream",
      "recapture-with-observation-points",
    ]);
  });

  it("requests runtime-probe rerun without blocking healthy telemetry current-state claims", () => {
    const plan = planEvidenceRecovery(
      integrity(),
      integrity({
        continuityComplete: false,
        safeForTemporalViolationClaims: false,
      }),
    );

    expect(plan.actions).toEqual([
      expect.objectContaining({
        channel: "runtime-probe",
        kind: "rerun-runtime-probe-bundle",
      }),
    ]);
    expect(plan.blocksCurrentStateClaims).toBe(false);
    expect(plan.blocksTemporalClaims).toBe(true);
  });

  it("treats unresolved state conflict as a current-state blocker", () => {
    const plan = planEvidenceRecovery(
      integrity({
        unresolvedConflictPredicates: ["route-ready"],
        safeForCurrentStateClaims: false,
        safeForTemporalViolationClaims: false,
      }),
      integrity(),
    );

    expect(plan.actions).toEqual([
      expect.objectContaining({
        channel: "telemetry",
        kind: "resolve-current-state-conflicts",
        blocks: expect.arrayContaining([
          "current-state-claims",
          "full-repair-authorization",
        ]),
      }),
    ]);
    expect(plan.blocksCurrentStateClaims).toBe(true);
  });
});
