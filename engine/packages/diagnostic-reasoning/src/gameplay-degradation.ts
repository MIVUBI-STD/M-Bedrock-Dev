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
        "Gameplay remains available only at reduced capacity: " +
        String(input.observedCapacity) +
        " of " +
        String(input.expectedCapacity) +
        ".",
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
