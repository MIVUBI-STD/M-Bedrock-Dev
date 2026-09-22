import type { SessionPhase } from "./session-model.js";

export interface PlayerObservation {
  playerId: string;
  connected: boolean;
  arenaId?: string;
  phase?: SessionPhase;
  progress?: number;
  tags?: readonly string[];
  scores?: Readonly<Record<string, number>>;
  position?: { x: number; y: number; z: number };
}

export interface ArenaObservation {
  arenaId: string;
  activePlayerIds?: readonly string[];
  cutsceneActive?: boolean;
  round?: number;
  tags?: readonly string[];
  scores?: Readonly<Record<string, number>>;
}

export interface EntityObservation {
  entityId: string;
  typeId: string;
  tags?: readonly string[];
  position?: { x: number; y: number; z: number };
  alive?: boolean;
  arenaId?: string;
}

export interface ChunkObservation {
  dimension: string;
  chunkX: number;
  chunkZ: number;
  state: "loaded" | "unloaded" | "unknown";
}

export interface RuntimeObservationSnapshot {
  schemaVersion: 1;
  capturedAt?: string;
  minecraftVersion?: string;
  artifactFingerprint?: string;
  tick?: number;
  players: readonly PlayerObservation[];
  arenas: readonly ArenaObservation[];
  entities?: readonly EntityObservation[];
  chunks?: readonly ChunkObservation[];
  metadata?: Readonly<Record<string, string | number | boolean>>;
}
