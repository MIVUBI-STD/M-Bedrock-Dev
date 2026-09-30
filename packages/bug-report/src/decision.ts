import type {
  BugFinderCategory,
  BugSeverity,
} from "./vocabulary.js";

export type GameplayProgressionImpact =
  | "blocked"
  | "degraded"
  | "unaffected";

export type RecoveryImpact =
  | "none"
  | "abnormal"
  | "normal";

export type StabilityImpact =
  | "crash-or-freeze"
  | "stable";

export type MaterialImpact =
  | "materially-wrong"
  | "correct";

export type FairnessImpact =
  | "materially-affected"
  | "unaffected";

export interface BugImpactAssessment {
  readonly progression: GameplayProgressionImpact;
  readonly recovery: RecoveryImpact;
  readonly stability: StabilityImpact;
  readonly coreMechanic: MaterialImpact;
  readonly importantState: MaterialImpact;
  readonly fairness: FairnessImpact;
}

export function classifyBugSeverity(
  impact: BugImpactAssessment,
): BugSeverity {
  if (
    impact.progression === "blocked" ||
    impact.recovery === "none" ||
    impact.stability === "crash-or-freeze"
  ) {
    return "blocker";
  }

  if (
    impact.progression === "degraded" ||
    impact.recovery === "abnormal" ||
    impact.coreMechanic === "materially-wrong" ||
    impact.importantState === "materially-wrong" ||
    impact.fairness === "materially-affected"
  ) {
    return "major";
  }

  return "minor";
}

export const BUG_PRIMARY_FAILURES = [
  "game-progression",
  "player-owned-state",
  "session-concurrency",
  "world-mutation",
  "entity-decision",
  "combat-rule",
  "score-reward",
  "presentation-feedback",
  "runtime-capacity",
  "runtime-compatibility",
] as const;

export type BugPrimaryFailure = (typeof BUG_PRIMARY_FAILURES)[number];

const categoryByPrimaryFailure: Readonly<
  Record<BugPrimaryFailure, BugFinderCategory>
> = {
  "game-progression": "game-flow",
  "player-owned-state": "player-state",
  "session-concurrency": "multiplayer-session",
  "world-mutation": "world-interaction",
  "entity-decision": "entity-behavior",
  "combat-rule": "combat",
  "score-reward": "score-reward",
  "presentation-feedback": "ui-feedback",
  "runtime-capacity": "performance-stability",
  "runtime-compatibility": "compatibility",
};

export function routeBugFinderCategory(
  primaryFailure: BugPrimaryFailure,
): BugFinderCategory {
  return categoryByPrimaryFailure[primaryFailure];
}

const severityRank: Readonly<Record<BugSeverity, number>> = {
  blocker: 3,
  major: 2,
  minor: 1,
};

export function highestBugSeverity(
  bugs: readonly { readonly severity: BugSeverity }[],
): BugSeverity | undefined {
  let highest: BugSeverity | undefined;

  for (const bug of bugs) {
    if (!highest || severityRank[bug.severity] > severityRank[highest]) {
      highest = bug.severity;
    }
  }

  return highest;
}
