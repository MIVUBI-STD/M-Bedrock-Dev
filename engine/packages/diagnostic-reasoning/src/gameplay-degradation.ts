export type GameplayCapabilityDeliveryStatus =
  | "DELIVERED"
  | "DEGRADED"
  | "MISSING"
  | "UNPROVEN";

export type GameplayCapabilityFailureClass =
  | "DESIGN_FAILURE"
  | "DESIGN_IMPLEMENTATION_MISMATCH"
  | "IMPLEMENTATION_FAILURE";

export type GameplayReportIssueType =
  | "BUG"
  | "DESIGN_MISMATCH";

export interface GameplayCapabilityDeliveryInput {
  readonly subjectId: string;
  readonly label: string;
  readonly playerVisible: boolean;
  readonly designed: boolean;
  readonly implementationPresent?: boolean;
  readonly behaviorComplete?: boolean;
  readonly expectedCapacity?: number;
  readonly playableCapacity?: number;
  readonly technicalConstraintReasons?: readonly string[];
  readonly evidenceIds?: readonly string[];
  readonly playerFacingEvidenceIds?: readonly string[];
}

export interface GameplayCapabilityDeliveryAssessment {
  readonly subjectId: string;
  readonly label: string;
  readonly status: GameplayCapabilityDeliveryStatus;
  readonly failureClass?: GameplayCapabilityFailureClass;
  readonly reportIssueType?: GameplayReportIssueType;
  readonly expectedCapacity?: number;
  readonly playableCapacity?: number;
  readonly technicalConstraintReasons: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly playerFacingEvidenceIds: readonly string[];
  readonly informationMismatch: boolean;
  readonly reason: string;
}

export function assessGameplayCapabilityDelivery(
  input: GameplayCapabilityDeliveryInput,
): GameplayCapabilityDeliveryAssessment {
  const evidenceIds = [
    ...new Set(input.evidenceIds ?? []),
  ].sort();
  const technicalConstraintReasons = [
    ...new Set(input.technicalConstraintReasons ?? []),
  ].sort();
  const playerFacingEvidenceIds = [
    ...new Set(
      input.playerFacingEvidenceIds ?? [],
    ),
  ].sort();

  if (
    input.expectedCapacity !== undefined &&
    input.playableCapacity !== undefined
  ) {
    if (
      input.playableCapacity <
      input.expectedCapacity
    ) {
      return {
        subjectId: input.subjectId,
        label: input.label,
        status: "DEGRADED",
        failureClass: "DESIGN_FAILURE",
        reportIssueType: "DESIGN_MISMATCH",
        expectedCapacity:
          input.expectedCapacity,
        playableCapacity:
          input.playableCapacity,
        technicalConstraintReasons,
        evidenceIds,
        playerFacingEvidenceIds,
        informationMismatch:
          playerFacingEvidenceIds.length > 0,
        reason:
          "The game presents capacity " +
          String(input.expectedCapacity) +
          " but only " +
          String(input.playableCapacity) +
          " is actually playable. Technical constraints may explain the cause, but the exposed game design does not deliver its visible capability.",
      };
    }
    return {
      subjectId: input.subjectId,
      label: input.label,
      status: "DELIVERED",
      expectedCapacity:
        input.expectedCapacity,
      playableCapacity:
        input.playableCapacity,
      technicalConstraintReasons,
      evidenceIds,
      playerFacingEvidenceIds,
      informationMismatch: false,
      reason:
        "Playable capacity meets the capability presented by the game.",
    };
  }

  if (
    input.designed &&
    input.playerVisible &&
    input.implementationPresent === false
  ) {
    return {
      subjectId: input.subjectId,
      label: input.label,
      status: "MISSING",
      failureClass:
        "DESIGN_IMPLEMENTATION_MISMATCH",
      reportIssueType: "DESIGN_MISMATCH",
      technicalConstraintReasons,
      evidenceIds,
      playerFacingEvidenceIds,
      informationMismatch:
        playerFacingEvidenceIds.length > 0,
      reason:
        "A player-visible designed capability has no implementation evidence.",
    };
  }

  if (
    input.designed &&
    input.playerVisible &&
    input.implementationPresent === true &&
    input.behaviorComplete === false
  ) {
    return {
      subjectId: input.subjectId,
      label: input.label,
      status: "DEGRADED",
      failureClass: "IMPLEMENTATION_FAILURE",
      reportIssueType: "BUG",
      technicalConstraintReasons,
      evidenceIds,
      playerFacingEvidenceIds,
      informationMismatch:
        playerFacingEvidenceIds.length > 0,
      reason:
        "The designed capability is implemented but its required gameplay chain is incomplete.",
    };
  }

  if (
    input.designed &&
    input.playerVisible &&
    input.behaviorComplete === true
  ) {
    return {
      subjectId: input.subjectId,
      label: input.label,
      status: "DELIVERED",
      technicalConstraintReasons,
      evidenceIds,
      playerFacingEvidenceIds,
      informationMismatch: false,
      reason:
        "The player-visible capability has a complete gameplay delivery chain.",
    };
  }

  return {
    subjectId: input.subjectId,
    label: input.label,
    status: "UNPROVEN",
    technicalConstraintReasons,
    evidenceIds,
    playerFacingEvidenceIds,
    informationMismatch: false,
    reason:
      "Capability delivery cannot be classified without enough grounded player-visible design and implementation evidence.",
  };
}

export type GameplayDegradationKind =
  | "fallback-masks-primary-failure"
  | "capacity-reduced"
  | "feature-disabled"
  | "quality-reduced";

export interface GameplayDegradationInput {
  readonly subjectId: string;
  readonly primaryExpected: boolean;
  readonly primaryObserved: boolean;
  readonly fallbackObserved?: boolean;
  readonly expectedCapacity?: number;
  readonly observedCapacity?: number;
  readonly evidenceIds?: readonly string[];
}

export interface GameplayDegradationSignal {
  readonly id: string;
  readonly subjectId: string;
  readonly kind: GameplayDegradationKind;
  readonly evidenceIds: readonly string[];
  readonly reason: string;
}

export function detectGameplayDegradation(
  input: GameplayDegradationInput,
): readonly GameplayDegradationSignal[] {
  const evidenceIds = [
    ...new Set(input.evidenceIds ?? []),
  ].sort();
  const signals: GameplayDegradationSignal[] = [];

  if (
    input.primaryExpected &&
    !input.primaryObserved &&
    input.fallbackObserved
  ) {
    signals.push({
      id:
        "degradation:fallback:" +
        input.subjectId,
      subjectId: input.subjectId,
      kind: "fallback-masks-primary-failure",
      evidenceIds,
      reason:
        "Fallback behavior keeps gameplay running while the intended primary mechanic is not observed.",
    });
  }

  if (
    input.expectedCapacity !== undefined &&
    input.observedCapacity !== undefined &&
    input.observedCapacity <
      input.expectedCapacity
  ) {
    signals.push({
      id:
        "degradation:capacity:" +
        input.subjectId,
      subjectId: input.subjectId,
      kind: "capacity-reduced",
      evidenceIds,
      reason:
        "Player-visible gameplay capacity is reduced from " +
        String(input.expectedCapacity) +
        " to " +
        String(input.observedCapacity) +
        ". A queue, fallback, performance safeguard, or platform limit may explain or mitigate the reduction, but does not erase the gameplay/design capacity mismatch.",
    });
  }

  if (
    input.primaryExpected &&
    !input.primaryObserved &&
    !input.fallbackObserved
  ) {
    signals.push({
      id:
        "degradation:feature:" +
        input.subjectId,
      subjectId: input.subjectId,
      kind: "feature-disabled",
      evidenceIds,
      reason:
        "A declared gameplay feature is not observed and no valid fallback is present.",
    });
  }

  return signals;
}
