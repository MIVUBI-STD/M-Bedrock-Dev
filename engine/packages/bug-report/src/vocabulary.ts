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

export type BugSeverity =
  | "blocker"
  | "major"
  | "minor";
