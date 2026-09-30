import type {
  ArenaObservation,
  PlayerObservation,
  RuntimeObservationSnapshot,
} from "./runtime-observation.js";
import type { SessionPhase } from "./session-model.js";

export interface RawBedrockPlayerState {
  playerId: string;
  connected: boolean;
  tags: readonly string[];
  scores: Readonly<Record<string, number | undefined>>;
}

export interface RawBedrockArenaState {
  arenaId: string;
  tags: readonly string[];
  scores: Readonly<Record<string, number | undefined>>;
}

export interface TagArenaRule {
  kind: "arena-tag";
  tagPrefix: string;
}

export interface TagPhaseRule {
  kind: "phase-tag";
  tag: string;
  phase: SessionPhase;
}

export interface ScorePhaseRule {
  kind: "phase-score";
  objective: string;
  values: Readonly<Record<string, SessionPhase>>;
}

export interface ScoreProgressRule {
  kind: "progress-score";
  objective: string;
}

export interface ArenaMembershipRule {
  kind: "membership-from-player-arena";
}

export interface ArenaCutsceneRule {
  kind: "cutscene-score";
  objective: string;
  activeValues: readonly number[];
}

export interface ArenaRoundRule {
  kind: "round-score";
  objective: string;
}

export interface BedrockObservationMapping {
  playerRules: readonly (
    | TagArenaRule
    | TagPhaseRule
    | ScorePhaseRule
    | ScoreProgressRule
  )[];
  arenaRules: readonly (
    | ArenaMembershipRule
    | ArenaCutsceneRule
    | ArenaRoundRule
  )[];
}

export interface MappingIssue {
  kind: "ambiguous" | "missing" | "invalid";
  subject: string;
  field: string;
  detail: string;
}

export interface BedrockObservationAdaptResult {
  snapshot: RuntimeObservationSnapshot;
  issues: MappingIssue[];
}

function deriveArenaId(
  state: RawBedrockPlayerState,
  rules: readonly BedrockObservationMapping["playerRules"][number][],
  issues: MappingIssue[],
): string | undefined {
  const matches = new Set<string>();

  for (const rule of rules) {
    if (rule.kind !== "arena-tag") continue;
    for (const tag of state.tags) {
      if (tag.startsWith(rule.tagPrefix) && tag.length > rule.tagPrefix.length) {
        matches.add(tag.slice(rule.tagPrefix.length));
      }
    }
  }

  if (matches.size > 1) {
    issues.push({
      kind: "ambiguous",
      subject: state.playerId,
      field: "arenaId",
      detail: `Multiple arena mappings found: ${[...matches].join(", ")}`,
    });
    return undefined;
  }

  return [...matches][0];
}

function derivePhase(
  state: RawBedrockPlayerState,
  rules: readonly BedrockObservationMapping["playerRules"][number][],
  issues: MappingIssue[],
): SessionPhase | undefined {
  const matches = new Set<SessionPhase>();

  for (const rule of rules) {
    if (rule.kind === "phase-tag" && state.tags.includes(rule.tag)) {
      matches.add(rule.phase);
    }

    if (rule.kind === "phase-score") {
      const value = state.scores[rule.objective];
      if (value === undefined) continue;
      const mapped = rule.values[String(value)];
      if (mapped) matches.add(mapped);
    }
  }

  if (matches.size > 1) {
    issues.push({
      kind: "ambiguous",
      subject: state.playerId,
      field: "phase",
      detail: `Multiple phase mappings found: ${[...matches].join(", ")}`,
    });
    return undefined;
  }

  return [...matches][0];
}

function deriveProgress(
  state: RawBedrockPlayerState,
  rules: readonly BedrockObservationMapping["playerRules"][number][],
  issues: MappingIssue[],
): number | undefined {
  const values = new Set<number>();

  for (const rule of rules) {
    if (rule.kind !== "progress-score") continue;
    const value = state.scores[rule.objective];
    if (value !== undefined) values.add(value);
  }

  if (values.size > 1) {
    issues.push({
      kind: "ambiguous",
      subject: state.playerId,
      field: "progress",
      detail: `Multiple progress mappings found: ${[...values].join(", ")}`,
    });
    return undefined;
  }

  return [...values][0];
}

export function adaptBedrockState(
  players: readonly RawBedrockPlayerState[],
  arenas: readonly RawBedrockArenaState[],
  mapping: BedrockObservationMapping,
  metadata: Omit<RuntimeObservationSnapshot, "schemaVersion" | "players" | "arenas"> = {},
): BedrockObservationAdaptResult {
  const issues: MappingIssue[] = [];
  const playerObservations: PlayerObservation[] = players.map((player) => {
    const arenaId = deriveArenaId(player, mapping.playerRules, issues);
    const phase = derivePhase(player, mapping.playerRules, issues);
    const progress = deriveProgress(player, mapping.playerRules, issues);

    return {
      playerId: player.playerId,
      connected: player.connected,
      ...(arenaId ? { arenaId } : {}),
      ...(phase ? { phase } : {}),
      ...(progress !== undefined ? { progress } : {}),
      tags: [...player.tags],
      scores: Object.fromEntries(
        Object.entries(player.scores).filter(([, value]) => value !== undefined),
      ) as Record<string, number>,
    };
  });

  const arenaObservations: ArenaObservation[] = arenas.map((arena) => {
    const observation: ArenaObservation = {
      arenaId: arena.arenaId,
      tags: [...arena.tags],
      scores: Object.fromEntries(
        Object.entries(arena.scores).filter(([, value]) => value !== undefined),
      ) as Record<string, number>,
    };

    for (const rule of mapping.arenaRules) {
      if (rule.kind === "membership-from-player-arena") {
        observation.activePlayerIds = playerObservations
          .filter((player) => player.arenaId === arena.arenaId)
          .map((player) => player.playerId);
      }

      if (rule.kind === "cutscene-score") {
        const value = arena.scores[rule.objective];
        if (value !== undefined) {
          observation.cutsceneActive = rule.activeValues.includes(value);
        }
      }

      if (rule.kind === "round-score") {
        const value = arena.scores[rule.objective];
        if (value !== undefined) observation.round = value;
      }
    }

    return observation;
  });

  return {
    snapshot: {
      schemaVersion: 1,
      ...metadata,
      players: playerObservations,
      arenas: arenaObservations,
    },
    issues,
  };
}
