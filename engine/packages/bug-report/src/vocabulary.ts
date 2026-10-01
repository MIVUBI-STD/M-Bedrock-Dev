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

export const BUG_SEVERITIES = [
  "blocker",
  "major",
  "minor",
] as const;

export type BugSeverity =
  (typeof BUG_SEVERITIES)[number];
