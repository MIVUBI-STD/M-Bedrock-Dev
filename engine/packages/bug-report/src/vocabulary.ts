export const BUG_FINDER_CATEGORIES = [
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
] as const;

export type BugFinderCategory =
  (typeof BUG_FINDER_CATEGORIES)[number];

export const BUG_FINDER_CATEGORY_LABELS: Readonly<
  Record<BugFinderCategory, string>
> = {
  "game-flow": "Game Flow",
  "player-state": "Player State",
  "multiplayer-session": "Multiplayer",
  "world-interaction": "World Interaction",
  "entity-behavior": "Entity Behavior",
  "combat": "Combat",
  "score-reward": "Score & Reward",
  "ui-feedback": "UI & Feedback",
  "performance-stability": "Performance & Stability",
  "compatibility": "Compatibility",
};

export function bugFinderCategoryLabel(
  category: BugFinderCategory,
): string {
  return BUG_FINDER_CATEGORY_LABELS[category];
}

export const BUG_SEVERITIES = [
  "blocker",
  "major",
  "minor",
] as const;

export type BugSeverity =
  (typeof BUG_SEVERITIES)[number];
