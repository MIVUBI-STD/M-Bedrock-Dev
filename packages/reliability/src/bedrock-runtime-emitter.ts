import type {
  RawBedrockArenaState,
  RawBedrockPlayerState,
} from "./bedrock-state-adapter.js";
import type {
  EntityObservation,
  RuntimeObservationSnapshot,
} from "./runtime-observation.js";

export interface BedrockScoreboardObjectiveLike {
  getScore(participant: unknown): number | undefined;
}

export interface BedrockScoreboardLike {
  getObjective(id: string): BedrockScoreboardObjectiveLike | undefined;
}

export interface BedrockPlayerLike {
  id: string;
  name?: string;
  typeId?: string;
  location?: { x: number; y: number; z: number };
  getTags(): string[];
}

export interface BedrockEntityLike {
  id: string;
  typeId: string;
  location?: { x: number; y: number; z: number };
  getTags(): string[];
}

export interface BedrockDimensionLike {
  id: string;
  getEntities(options?: unknown): BedrockEntityLike[];
}

export interface BedrockWorldLike {
  scoreboard: BedrockScoreboardLike;
  getAllPlayers(): BedrockPlayerLike[];
  getDimension(id: string): BedrockDimensionLike;
}

export interface BedrockSystemLike {
  readonly currentTick: number;
}

export interface ArenaRuntimeBinding {
  arenaId: string;
  participant: string;
}

export interface EntityCaptureQuery {
  dimension: string;
  options?: unknown;
  arenaTagPrefix?: string;
}

export interface BedrockRuntimeEmitterConfig {
  playerObjectives: readonly string[];
  arenaObjectives: readonly string[];
  arenas: readonly ArenaRuntimeBinding[];
  entityQueries?: readonly EntityCaptureQuery[];
  minecraftVersion?: string;
  artifactFingerprint?: string;
}

export interface RawRuntimeCapture {
  players: RawBedrockPlayerState[];
  arenas: RawBedrockArenaState[];
  entities: EntityObservation[];
  tick: number;
  minecraftVersion?: string;
  artifactFingerprint?: string;
  issues: RuntimeCaptureIssue[];
}

export interface RuntimeCaptureIssue {
  kind:
    | "objective-missing"
    | "score-read-failed"
    | "player-tags-failed"
    | "entity-query-failed"
    | "entity-tags-failed";
  subject: string;
  detail: string;
}

function safeTags(
  subject: string,
  getTags: () => string[],
  issues: RuntimeCaptureIssue[],
  failureKind: "player-tags-failed" | "entity-tags-failed",
): string[] {
  try {
    return getTags();
  } catch (error) {
    issues.push({
      kind: failureKind,
      subject,
      detail: error instanceof Error ? error.message : "Tag read failed.",
    });
    return [];
  }
}

function readScore(
  world: BedrockWorldLike,
  objectiveId: string,
  participant: unknown,
  subject: string,
  issues: RuntimeCaptureIssue[],
): number | undefined {
  const objective = world.scoreboard.getObjective(objectiveId);
  if (!objective) {
    issues.push({
      kind: "objective-missing",
      subject: objectiveId,
      detail: `Scoreboard objective ${objectiveId} does not exist.`,
    });
    return undefined;
  }

  try {
    return objective.getScore(participant);
  } catch (error) {
    issues.push({
      kind: "score-read-failed",
      subject,
      detail: error instanceof Error ? error.message : `Failed to read ${objectiveId}.`,
    });
    return undefined;
  }
}

function arenaFromTags(
  tags: readonly string[],
  prefix: string | undefined,
): string | undefined {
  if (!prefix) return undefined;
  const matches = tags
    .filter((tag) => tag.startsWith(prefix) && tag.length > prefix.length)
    .map((tag) => tag.slice(prefix.length));

  return matches.length === 1 ? matches[0] : undefined;
}

export function captureBedrockRuntimeState(
  world: BedrockWorldLike,
  system: BedrockSystemLike,
  config: BedrockRuntimeEmitterConfig,
): RawRuntimeCapture {
  const issues: RuntimeCaptureIssue[] = [];

  const players = world.getAllPlayers().map((player): RawBedrockPlayerState => {
    const scores: Record<string, number | undefined> = {};
    for (const objectiveId of config.playerObjectives) {
      scores[objectiveId] = readScore(
        world,
        objectiveId,
        player,
        player.id,
        issues,
      );
    }

    return {
      playerId: player.id,
      connected: true,
      tags: safeTags(player.id, () => player.getTags(), issues, "player-tags-failed"),
      scores,
    };
  });

  const arenas = config.arenas.map((arena): RawBedrockArenaState => {
    const scores: Record<string, number | undefined> = {};
    for (const objectiveId of config.arenaObjectives) {
      scores[objectiveId] = readScore(
        world,
        objectiveId,
        arena.participant,
        arena.arenaId,
        issues,
      );
    }

    return {
      arenaId: arena.arenaId,
      tags: [],
      scores,
    };
  });

  const entities: EntityObservation[] = [];
  for (const query of config.entityQueries ?? []) {
    let dimension: BedrockDimensionLike;
    try {
      dimension = world.getDimension(query.dimension);
    } catch (error) {
      issues.push({
        kind: "entity-query-failed",
        subject: query.dimension,
        detail: error instanceof Error ? error.message : "Dimension lookup failed.",
      });
      continue;
    }

    let found: BedrockEntityLike[];
    try {
      found = dimension.getEntities(query.options);
    } catch (error) {
      issues.push({
        kind: "entity-query-failed",
        subject: query.dimension,
        detail: error instanceof Error ? error.message : "Entity query failed.",
      });
      continue;
    }

    for (const entity of found) {
      const tags = safeTags(entity.id, () => entity.getTags(), issues, "entity-tags-failed");
      const arenaId = arenaFromTags(tags, query.arenaTagPrefix);
      entities.push({
        entityId: entity.id,
        typeId: entity.typeId,
        dimension: query.dimension,
        tags,
        ...(entity.location ? { position: { ...entity.location } } : {}),
        alive: true,
        ...(arenaId ? { arenaId } : {}),
      });
    }
  }

  return {
    players,
    arenas,
    entities,
    tick: system.currentTick,
    ...(config.minecraftVersion ? { minecraftVersion: config.minecraftVersion } : {}),
    ...(config.artifactFingerprint ? { artifactFingerprint: config.artifactFingerprint } : {}),
    issues,
  };
}

export function rawCaptureMetadata(
  capture: RawRuntimeCapture,
): Omit<RuntimeObservationSnapshot, "schemaVersion" | "players" | "arenas"> {
  return {
    tick: capture.tick,
    ...(capture.minecraftVersion ? { minecraftVersion: capture.minecraftVersion } : {}),
    ...(capture.artifactFingerprint ? { artifactFingerprint: capture.artifactFingerprint } : {}),
    ...(capture.entities.length > 0 ? { entities: capture.entities } : {}),
    metadata: {
      captureIssueCount: capture.issues.length,
    },
  };
}
