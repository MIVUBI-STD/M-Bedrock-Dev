import {
  deriveVitalGameplayClosure,
  type VitalGameplayClosure,
  type VitalGameplayFindingInput,
} from "./map-audit-vital-closure.js";
import type {
  AuditObligation,
} from "./map-audit-obligations.js";

export type InformationIntegrityStatus =
  | "CLOSED_CLEAR"
  | "CLOSED_WITH_FINDINGS"
  | "BLOCKED";

export type ZeroFindingStatus =
  | "ELIGIBLE"
  | "NOT_ELIGIBLE"
  | "NOT_APPLICABLE";

export type MapAuditQualityFinding =
  VitalGameplayFindingInput;

export interface MapAuditQualityGateInput {
  readonly controlStatus: "READY_FOR_REVIEW" | "BLOCKED";
  readonly coverageDisposition: "accounted" | "incomplete";
  readonly gameplayClosureStatus: "CLOSED" | "PARTIAL" | "OPEN";
  readonly honestyStatus: "PASS" | "VIOLATION";
  readonly findings: readonly MapAuditQualityFinding[];
  readonly auditObligationCount: number;
  readonly validationTestCount: number;
  readonly auditObligations?: readonly AuditObligation[];
  readonly multiArenaDetected?: boolean;
}

export interface InformationIntegrityAssessment {
  readonly policy: "canonical-information-integrity-projection";
  readonly status: InformationIntegrityStatus;
  readonly findingIds: readonly string[];
  readonly unresolvedFindingIds: readonly string[];
  readonly reasons: readonly string[];
}

export interface ZeroFindingAssessment {
  readonly policy: "closed-audit-zero-finding";
  readonly status: ZeroFindingStatus;
  readonly reasons: readonly string[];
}

export interface MapAuditQualityGates {
  readonly informationIntegrity: InformationIntegrityAssessment;
  readonly zeroFinding: ZeroFindingAssessment;
  readonly vitalGameplay: VitalGameplayClosure;
}

export function deriveMapAuditQualityGates(
  input: MapAuditQualityGateInput,
): MapAuditQualityGates {
  const informationFindings = input.findings
    .filter((item) => item.informationMismatch)
    .sort((a, b) => a.id.localeCompare(b.id));
  const unresolvedInformationFindingIds =
    informationFindings
      .filter((item) => item.status === "NEED_VALIDATION")
      .map((item) => item.id);

  const auditClosed =
    input.controlStatus === "READY_FOR_REVIEW" &&
    input.coverageDisposition === "accounted" &&
    input.gameplayClosureStatus === "CLOSED" &&
    input.honestyStatus === "PASS";

  const informationReasons: string[] = [];
  if (!auditClosed) {
    if (input.controlStatus !== "READY_FOR_REVIEW") {
      informationReasons.push(
        "Canonical selected-map audit is not ready for review.",
      );
    }
    if (input.coverageDisposition !== "accounted") {
      informationReasons.push(
        "Gameplay surface coverage is incomplete.",
      );
    }
    if (input.gameplayClosureStatus !== "CLOSED") {
      informationReasons.push(
        "Gameplay model/scenario closure is not closed.",
      );
    }
    if (input.honestyStatus !== "PASS") {
      informationReasons.push(
        "Audit honesty gate is not PASS.",
      );
    }
  } else if (informationFindings.length === 0) {
    informationReasons.push(
      "No player-facing information contradiction remains visible in the closed canonical audit.",
    );
  } else {
    informationReasons.push(
      "Player-facing information contradiction(s) are preserved in the canonical finding lanes.",
    );
  }

  const informationIntegrity: InformationIntegrityAssessment = {
    policy: "canonical-information-integrity-projection",
    status: !auditClosed
      ? "BLOCKED"
      : informationFindings.length > 0
        ? "CLOSED_WITH_FINDINGS"
        : "CLOSED_CLEAR",
    findingIds: informationFindings.map((item) => item.id),
    unresolvedFindingIds: unresolvedInformationFindingIds,
    reasons: informationReasons,
  };

  const zeroFindingReasons: string[] = [];
  let zeroFindingStatus: ZeroFindingStatus;

  if (input.findings.length > 0) {
    zeroFindingStatus = "NOT_APPLICABLE";
    zeroFindingReasons.push(
      "The audit contains gameplay findings, so zero-finding assessment does not apply.",
    );
  } else {
    const blockers: string[] = [];
    if (!auditClosed) {
      blockers.push(
        "canonical audit closure is incomplete",
      );
    }
    if (input.auditObligationCount > 0) {
      blockers.push(
        input.auditObligationCount +
          " audit obligation(s) remain",
      );
    }
    if (input.validationTestCount > 0) {
      blockers.push(
        input.validationTestCount +
          " validation test group(s) remain",
      );
    }

    if (blockers.length === 0) {
      zeroFindingStatus = "ELIGIBLE";
      zeroFindingReasons.push(
        "No finding is present and canonical discovery, model, proof, honesty, and coverage closure are complete.",
      );
    } else {
      zeroFindingStatus = "NOT_ELIGIBLE";
      zeroFindingReasons.push(...blockers);
    }
  }

  const vitalGameplay = deriveVitalGameplayClosure({
    controlStatus: input.controlStatus,
    multiArenaDetected:
      input.multiArenaDetected ?? false,
    findings: input.findings,
    auditObligations:
      input.auditObligations ?? [],
  });

  return {
    informationIntegrity,
    zeroFinding: {
      policy: "closed-audit-zero-finding",
      status: zeroFindingStatus,
      reasons: zeroFindingReasons,
    },
    vitalGameplay,
  };
}
