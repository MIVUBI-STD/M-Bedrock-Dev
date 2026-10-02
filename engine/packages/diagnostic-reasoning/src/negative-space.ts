export type NegativeSpaceKind =
  | "producer-without-consumer"
  | "consumer-without-producer"
  | "entry-without-exit"
  | "reset-without-baseline"
  | "declared-without-effect";

export interface NegativeSpaceSignal {
  readonly id: string;
  readonly kind: NegativeSpaceKind;
  readonly subjectId: string;
  readonly evidenceIds: readonly string[];
  readonly reason: string;
}

export interface NegativeSpaceInput {
  readonly subjectId: string;
  readonly hasProducer?: boolean;
  readonly hasConsumer?: boolean;
  readonly hasEntry?: boolean;
  readonly hasExit?: boolean;
  readonly hasReset?: boolean;
  readonly hasBaselineRestore?: boolean;
  readonly declared?: boolean;
  readonly hasEffect?: boolean;
  readonly evidenceIds?: readonly string[];
}

export function findNegativeSpace(
  input: NegativeSpaceInput,
): readonly NegativeSpaceSignal[] {
  const evidenceIds = [...new Set(input.evidenceIds ?? [])].sort();
  const output: NegativeSpaceSignal[] = [];
  const add = (kind: NegativeSpaceKind, reason: string) =>
    output.push({
      id: "negative-space:" + kind + ":" + input.subjectId,
      kind,
      subjectId: input.subjectId,
      evidenceIds,
      reason,
    });

  if (input.hasProducer && input.hasConsumer === false) {
    add("producer-without-consumer", "State/event is produced but no consuming gameplay path is present.");
  }
  if (input.hasConsumer && input.hasProducer === false) {
    add("consumer-without-producer", "Gameplay waits for state/event with no producing path.");
  }
  if (input.hasEntry && input.hasExit === false) {
    add("entry-without-exit", "Gameplay state is reachable but has no grounded exit.");
  }
  if (input.hasReset && input.hasBaselineRestore === false) {
    add("reset-without-baseline", "Reset exists but baseline restoration is not proven.");
  }
  if (input.declared && input.hasEffect === false) {
    add("declared-without-effect", "Mechanic is declared but no gameplay effect is grounded.");
  }

  return output;
}
