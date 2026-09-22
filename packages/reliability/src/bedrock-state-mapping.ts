import type { BedrockObservationMapping } from "./bedrock-state-adapter.js";

export const DEFAULT_ARENA_SESSION_MAPPING: BedrockObservationMapping = {
  playerRules: [
    {
      kind: "arena-tag",
      tagPrefix: "arena:",
    },
    {
      kind: "phase-tag",
      tag: "session:assigned",
      phase: "assigned",
    },
    {
      kind: "phase-tag",
      tag: "session:starting",
      phase: "starting",
    },
    {
      kind: "phase-tag",
      tag: "session:playing",
      phase: "playing",
    },
    {
      kind: "phase-tag",
      tag: "session:completed",
      phase: "completed",
    },
    {
      kind: "progress-score",
      objective: "session_progress",
    },
  ],
  arenaRules: [
    {
      kind: "membership-from-player-arena",
    },
    {
      kind: "cutscene-score",
      objective: "cutscene_active",
      activeValues: [1],
    },
    {
      kind: "round-score",
      objective: "round",
    },
  ],
};
