import type {
  BugFinderCategory,
  BugSeverity,
} from "./vocabulary.js";
import type {
  BugReportBug,
  BugReportV1,
} from "./legacy-v1.js";

const canonicalCategoryOrder: readonly BugFinderCategory[] = [
  "game-flow",
  "player-state",
  "multiplayer-session",
  "world-interaction",
  "entity-behavior",
  "combat",
  "score-reward",
  "ui-feedback",
  "performance-stability",
  "compatibility",
];

const categoryRank = new Map<BugFinderCategory, number>(
  canonicalCategoryOrder.map((category, index) => [category, index]),
);

const severityRank: Readonly<Record<BugSeverity, number>> = {
  blocker: 0,
  major: 1,
  minor: 2,
};

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function compareBugs(left: BugReportBug, right: BugReportBug): number {
  const severityDelta =
    severityRank[left.severity] - severityRank[right.severity];
  if (severityDelta !== 0) return severityDelta;
  return compareText(left.title, right.title);
}

export function normalizeBugReportV1(report: BugReportV1): BugReportV1 {
  return {
    ...report,
    bugFinders: [...report.bugFinders]
      .map((finder) => ({
        ...finder,
        bugs: [...finder.bugs].sort(compareBugs),
      }))
      .sort((left, right) => {
        const leftRank = categoryRank.get(left.category);
        const rightRank = categoryRank.get(right.category);
        return (leftRank ?? Number.MAX_SAFE_INTEGER) -
          (rightRank ?? Number.MAX_SAFE_INTEGER);
      }),
  };
}
