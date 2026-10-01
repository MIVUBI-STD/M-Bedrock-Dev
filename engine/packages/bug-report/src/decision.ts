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

export type GameplayIntentAssessment =
  | "grounded-contradiction"
  | "grounded-designed-behavior"
  | "ambiguous";

export type PlayerObservableImpact =
  | "blocking"
  | "material"
  | "limited"
  | "none";

export type BugCandidateDisposition =
  | "reportable-bug"
  | "designed-behavior"
  | "ambiguous-intent"
  | "no-player-impact"
  | "below-report-threshold"
  | "tester-trigger-missing";

export interface BugCandidateAssessment {
  readonly intent: GameplayIntentAssessment;
  readonly playerImpact: PlayerObservableImpact;
  readonly testerObservable: boolean;
}

export interface BugCandidateDecision {
  readonly disposition: BugCandidateDisposition;
  readonly reportable: boolean;
}

export function classifyBugCandidate(
  candidate: BugCandidateAssessment,
): BugCandidateDecision {
  if (candidate.intent === "grounded-designed-behavior") {
    return {
      disposition: "designed-behavior",
      reportable: false,
    };
  }

  if (candidate.intent === "ambiguous") {
    return {
      disposition: "ambiguous-intent",
      reportable: false,
    };
  }

  if (
    candidate.playerImpact === "none" ||
    !candidate.testerObservable
  ) {
    return {
      disposition:
        candidate.playerImpact === "none"
          ? "no-player-impact"
          : "tester-trigger-missing",
      reportable: false,
    };
  }

  if (candidate.playerImpact === "limited") {
    return {
      disposition: "below-report-threshold",
      reportable: false,
    };
  }

  return {
    disposition: "reportable-bug",
    reportable: true,
  };
}

export function classifyBugSeverity(
  impact: BugImpactAssessment,
): BugSeverity {
  if (impact.stability === "crash-or-freeze") {
    return "blocker";
  }

  if (
    impact.progression === "blocked" &&
    impact.recovery !== "normal"
  ) {
    return "blocker";
  }

  if (
    impact.progression === "blocked" ||
    impact.progression === "degraded" ||
    impact.recovery === "abnormal" ||
    (
      impact.recovery === "none" &&
      (
        impact.coreMechanic === "materially-wrong" ||
        impact.importantState === "materially-wrong"
      )
    ) ||
    impact.coreMechanic === "materially-wrong" ||
    impact.importantState === "materially-wrong" ||
    impact.fairness === "materially-affected"
  ) {
    return "major";
  }

  return "minor";
}

export function shouldIncludeInDefaultBugReport(
  severity: BugSeverity,
): boolean {
  return severity === "blocker" || severity === "major";
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
