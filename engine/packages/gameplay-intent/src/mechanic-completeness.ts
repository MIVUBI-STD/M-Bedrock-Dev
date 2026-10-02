export type MechanicCompletenessStage =
  | "declared"
  | "reachable"
  | "triggered"
  | "consumed"
  | "effect-applied"
  | "player-visible";

export interface MechanicCompletenessInput {
  readonly mechanicId: string;
  readonly stages: Readonly<Record<MechanicCompletenessStage, boolean>>;
  readonly evidenceIds?: readonly string[];
}

export interface MechanicCompletenessResult {
  readonly mechanicId: string;
  readonly complete: boolean;
  readonly missingStages: readonly MechanicCompletenessStage[];
  readonly evidenceIds: readonly string[];
}

const STAGES: readonly MechanicCompletenessStage[] = [
  "declared",
  "reachable",
  "triggered",
  "consumed",
  "effect-applied",
  "player-visible",
];

export function assessMechanicCompleteness(
  input: MechanicCompletenessInput,
): MechanicCompletenessResult {
  const missingStages = STAGES.filter(
    (stage) => input.stages[stage] !== true,
  );

  return {
    mechanicId: input.mechanicId,
    complete: missingStages.length === 0,
    missingStages,
    evidenceIds: [...new Set(input.evidenceIds ?? [])].sort(),
  };
}
