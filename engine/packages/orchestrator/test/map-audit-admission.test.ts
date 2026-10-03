import { describe, expect, it } from "vitest";
import {
  assessSelectedMapAuditAdmission,
} from "../src/map-audit-admission.js";
import type {
  MandatoryAuditProcedureReceipt,
} from "../src/inspection/mandatory-audit-procedure.js";

function procedure(
  blockingCheckpointIds: readonly string[],
): MandatoryAuditProcedureReceipt {
  const checkpoints = [
    {
      id: "A1",
      block: "TARGET" as const,
      label: "Selected Artifact Integrity",
    },
    {
      id: "A2",
      block: "DISCOVERY" as const,
      label: "Gameplay Surface Discovery",
    },
    {
      id: "A7",
      block: "UNDERSTAND" as const,
      label: "Gameplay Model Closure",
    },
  ].map((item) => ({
    ...item,
    status:
      blockingCheckpointIds.includes(item.id)
        ? "OPEN" as const
        : "CLOSED" as const,
    reasonCode:
      blockingCheckpointIds.includes(item.id)
        ? "PROCEDURE_BLOCKED" as const
        : "COMPLETE" as const,
    blocksPublication:
      blockingCheckpointIds.includes(item.id),
    obligations: [],
    evidenceIds: [],
    outputIds: [],
    reason: item.label,
  }));

  return {
    schemaVersion: 1,
    policy: "mandatory-gameplay-audit-procedure",
    checkpoints,
    blocks: [],
    status:
      blockingCheckpointIds.length > 0
        ? "OPEN"
        : "CLOSED",
    stateRegistry: [],
    ownershipRegistry: [],
    progressionContracts: [],
    blockingCheckpointIds,
    reasons: [],
  };
}

describe("selected-map audit admission", () => {
  it("blocks when the mandatory procedure is missing", () => {
    const result = assessSelectedMapAuditAdmission({
      mandatoryAuditProcedure: undefined,
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.firstBlockingStage).toBe("TARGET");
    expect(result.issues[0]?.code).toBe(
      "MISSING_PROCEDURE",
    );
  });

  it("uses checkpoint-owned stage as the single blocking truth", () => {
    const result = assessSelectedMapAuditAdmission({
      mandatoryAuditProcedure: procedure(["A2"]),
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.firstBlockingStage).toBe("DISCOVERY");
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: "PROCEDURE_BLOCKED",
        stage: "DISCOVERY",
      }),
    ]);
  });

  it("admits review only when no mandatory checkpoint blocks", () => {
    const result = assessSelectedMapAuditAdmission({
      mandatoryAuditProcedure: procedure([]),
    });

    expect(result.status).toBe("READY");
    expect(result.firstBlockingStage).toBeUndefined();
    expect(result.issues).toEqual([]);
  });
});
