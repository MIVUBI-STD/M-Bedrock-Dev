import { createHash } from "node:crypto";
import type {
  RuntimeObservationSnapshot,
  SessionPhase,
} from "../../reliability/src/index.js";
import {
  distinctRuntimeStates,
  runtimeSnapshotSemanticKey,
  runtimeVersions,
} from "./invariant-diversity.js";
import type {
  ArenaRegion,
  CandidateInvariantKind,
  InvariantMiningOptions,
  InvariantMiningResult,
  MinedInvariantCandidate,
  TagScoreRelation,
} from "./invariant-mining-types.js";

interface CandidateAccumulator {
  kind: CandidateInvariantKind;
  description: string;
  parameters?: Readonly<Record<string, string | number | boolean>>;
  observations: number;
  distinctStates: Set<string>;
  versions: Set<string>;
  antecedentMatches: number;
  satisfied: number;
  counterexamples: number;
  evidence: string[];
  counterexampleEvidence: string[];
}

function candidateId(
  kind: CandidateInvariantKind,
  parameters?: Readonly<Record<string, string | number | boolean>>,
): string {
  return "inv_candidate_" + createHash("sha256")
    .update(JSON.stringify({ kind, parameters: parameters ?? {} }))
    .digest("hex")
    .slice(0, 16);
}

function makeAccumulator(
  snapshots: readonly RuntimeObservationSnapshot[],
  kind: CandidateInvariantKind,
  description: string,
  parameters?: Readonly<Record<string, string | number | boolean>>,
): CandidateAccumulator {
  return {
    kind,
    description,
    ...(parameters ? { parameters } : {}),
    observations: snapshots.length,
    distinctStates: new Set<string>(),
    versions: new Set<string>(),
    antecedentMatches: 0,
    satisfied: 0,
    counterexamples: 0,
    evidence: [],
    counterexampleEvidence: [],
  };
}

function observe(
  acc: CandidateAccumulator,
  snapshot: RuntimeObservationSnapshot,
): void {
  acc.distinctStates.add(runtimeSnapshotSemanticKey(snapshot));
  if (snapshot.minecraftVersion) acc.versions.add(snapshot.minecraftVersion);
}

function addEvidence(list: string[], value: string): void {
  if (!list.includes(value) && list.length < 20) list.push(value);
}

function record(
  acc: CandidateAccumulator,
  snapshot: RuntimeObservationSnapshot,
  satisfied: boolean,
  label: string,
): void {
  observe(acc, snapshot);
  acc.antecedentMatches += 1;
  if (satisfied) {
    acc.satisfied += 1;
    addEvidence(acc.evidence, label);
  } else {
    acc.counterexamples += 1;
    addEvidence(acc.counterexampleEvidence, label);
  }
}

function playerPhaseConnected(snapshots: readonly RuntimeObservationSnapshot[]) {
  const acc = makeAccumulator(
    snapshots,
    "player-phase-implies-connected",
    "Players observed in active session phases are connected.",
  );
  const active = new Set<SessionPhase>(["assigned", "starting", "playing", "completed"]);

  for (const snapshot of snapshots) {
    for (const player of snapshot.players) {
      if (!player.phase || !active.has(player.phase)) continue;
      record(
        acc,
        snapshot,
        player.connected,
        `tick=${snapshot.tick ?? "?"},player=${player.playerId},phase=${player.phase}`,
      );
    }
  }
  return acc;
}

function playerPhaseArena(snapshots: readonly RuntimeObservationSnapshot[]) {
  const acc = makeAccumulator(
    snapshots,
    "player-phase-implies-arena",
    "Players observed in active session phases have an arena assignment.",
  );
  const active = new Set<SessionPhase>(["assigned", "starting", "playing", "completed"]);

  for (const snapshot of snapshots) {
    for (const player of snapshot.players) {
      if (!player.phase || !active.has(player.phase)) continue;
      record(
        acc,
        snapshot,
        Boolean(player.arenaId),
        `tick=${snapshot.tick ?? "?"},player=${player.playerId},phase=${player.phase}`,
      );
    }
  }
  return acc;
}

function cutsceneStartingPlayer(snapshots: readonly RuntimeObservationSnapshot[]) {
  const acc = makeAccumulator(
    snapshots,
    "arena-cutscene-implies-starting-player",
    "An active arena cutscene coincides with at least one starting player assigned to that arena.",
  );

  for (const snapshot of snapshots) {
    for (const arena of snapshot.arenas) {
      if (arena.cutsceneActive !== true) continue;
      const matches = snapshot.players.some((player) =>
        player.arenaId === arena.arenaId && player.phase === "starting",
      );
      record(
        acc,
        snapshot,
        matches,
        `tick=${snapshot.tick ?? "?"},arena=${arena.arenaId}`,
      );
    }
  }
  return acc;
}

function disconnectedZeroProgress(snapshots: readonly RuntimeObservationSnapshot[]) {
  const acc = makeAccumulator(
    snapshots,
    "disconnected-implies-zero-progress",
    "Disconnected players have zero observed active progress.",
  );

  for (const snapshot of snapshots) {
    for (const player of snapshot.players) {
      if (player.connected || player.progress === undefined) continue;
      record(
        acc,
        snapshot,
        player.progress === 0,
        `tick=${snapshot.tick ?? "?"},player=${player.playerId},progress=${player.progress}`,
      );
    }
  }
  return acc;
}

function tagScoreRelation(
  snapshots: readonly RuntimeObservationSnapshot[],
  relation: TagScoreRelation,
) {
  const acc = makeAccumulator(
    snapshots,
    "player-tag-implies-score",
    `Player tag ${relation.tag} implies score relation ${relation.relation} for objective ${relation.objective}.`,
    {
      tag: relation.tag,
      objective: relation.objective,
      relation: relation.relation,
    },
  );

  for (const snapshot of snapshots) {
    for (const player of snapshot.players) {
      if (!player.tags?.includes(relation.tag)) continue;
      const value = player.scores?.[relation.objective];
      const satisfied = relation.relation === "present"
        ? value !== undefined
        : value !== undefined && value !== 0;
      record(
        acc,
        snapshot,
        satisfied,
        `tick=${snapshot.tick ?? "?"},player=${player.playerId},tag=${relation.tag},score=${value ?? "missing"}`,
      );
    }
  }
  return acc;
}

function playingProgressNondecreasing(
  snapshots: readonly RuntimeObservationSnapshot[],
) {
  const acc = makeAccumulator(
    snapshots,
    "playing-progress-nondecreasing",
    "While a player remains in playing phase, observed progress does not decrease between consecutive timed snapshots.",
  );
  const ordered = [...snapshots]
    .filter((snapshot) => snapshot.tick !== undefined)
    .sort((a, b) => a.tick! - b.tick!);

  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1]!;
    const current = ordered[index]!;
    for (const player of current.players) {
      const before = previous.players.find((item) => item.playerId === player.playerId);
      if (
        player.phase !== "playing" ||
        before?.phase !== "playing" ||
        player.progress === undefined ||
        before.progress === undefined
      ) continue;

      record(
        acc,
        current,
        player.progress >= before.progress,
        `ticks=${previous.tick}->${current.tick},player=${player.playerId},progress=${before.progress}->${player.progress}`,
      );
    }
  }
  return acc;
}

function entityArenaTagConsistency(
  snapshots: readonly RuntimeObservationSnapshot[],
) {
  const acc = makeAccumulator(
    snapshots,
    "entity-arena-tag-consistency",
    "Entities with a semantic arenaId carry the matching arena:<id> tag.",
  );

  for (const snapshot of snapshots) {
    for (const entity of snapshot.entities ?? []) {
      if (!entity.arenaId || !entity.tags) continue;
      record(
        acc,
        snapshot,
        entity.tags.includes(`arena:${entity.arenaId}`),
        `tick=${snapshot.tick ?? "?"},entity=${entity.entityId},arena=${entity.arenaId}`,
      );
    }
  }
  return acc;
}

function insideRegion(
  position: { x: number; y: number; z: number },
  region: ArenaRegion,
): boolean {
  return position.x >= Math.min(region.min.x, region.max.x) &&
    position.x <= Math.max(region.min.x, region.max.x) &&
    position.y >= Math.min(region.min.y, region.max.y) &&
    position.y <= Math.max(region.min.y, region.max.y) &&
    position.z >= Math.min(region.min.z, region.max.z) &&
    position.z <= Math.max(region.min.z, region.max.z);
}

function entityWithinArenaRegion(
  snapshots: readonly RuntimeObservationSnapshot[],
  region: ArenaRegion,
) {
  const acc = makeAccumulator(
    snapshots,
    "entity-within-arena-region",
    `Entities assigned to ${region.arenaId} remain within the configured arena region.`,
    { arenaId: region.arenaId },
  );

  for (const snapshot of snapshots) {
    for (const entity of snapshot.entities ?? []) {
      if (entity.arenaId !== region.arenaId || !entity.position) continue;
      if (region.dimension && entity.dimension && entity.dimension !== region.dimension) continue;
      record(
        acc,
        snapshot,
        insideRegion(entity.position, region),
        `tick=${snapshot.tick ?? "?"},entity=${entity.entityId},position=${entity.position.x},${entity.position.y},${entity.position.z}`,
      );
    }
  }
  return acc;
}

function finalize(
  acc: CandidateAccumulator,
  options: InvariantMiningOptions,
): MinedInvariantCandidate {
  const confidence = acc.antecedentMatches === 0
    ? 0
    : acc.satisfied / acc.antecedentMatches;
  const minDistinctStates = options.minDistinctStates ?? 3;

  let status: MinedInvariantCandidate["status"] = "candidate";
  if (acc.counterexamples > 0) {
    status = "rejected";
  } else if (
    acc.antecedentMatches >= options.minAntecedentMatches &&
    acc.distinctStates.size >= minDistinctStates &&
    confidence >= options.minConfidence
  ) {
    status = "supported";
  }

  return {
    id: candidateId(acc.kind, acc.parameters),
    kind: acc.kind,
    description: acc.description,
    ...(acc.parameters ? { parameters: acc.parameters } : {}),
    minecraftVersions: [...acc.versions].sort(),
    support: {
      observations: acc.observations,
      distinctStates: acc.distinctStates.size,
      distinctVersions: acc.versions.size,
      antecedentMatches: acc.antecedentMatches,
      satisfied: acc.satisfied,
      counterexamples: acc.counterexamples,
      confidence,
    },
    status,
    evidence: acc.evidence,
    counterexampleEvidence: acc.counterexampleEvidence,
    challengeEvidence: [],
  };
}

export function mineRuntimeInvariants(
  knownGoodSnapshots: readonly RuntimeObservationSnapshot[],
  options: InvariantMiningOptions = {
    minAntecedentMatches: 20,
    minConfidence: 1,
    minDistinctStates: 3,
  },
): InvariantMiningResult {
  const accumulators = [
    playerPhaseConnected(knownGoodSnapshots),
    playerPhaseArena(knownGoodSnapshots),
    cutsceneStartingPlayer(knownGoodSnapshots),
    disconnectedZeroProgress(knownGoodSnapshots),
    playingProgressNondecreasing(knownGoodSnapshots),
    entityArenaTagConsistency(knownGoodSnapshots),
    ...(options.tagScoreRelations ?? []).map((relation) =>
      tagScoreRelation(knownGoodSnapshots, relation),
    ),
    ...(options.arenaRegions ?? []).map((region) =>
      entityWithinArenaRegion(knownGoodSnapshots, region),
    ),
  ];

  const candidates = accumulators.map((acc) => finalize(acc, options));

  return {
    observations: knownGoodSnapshots.length,
    distinctStates: distinctRuntimeStates(knownGoodSnapshots),
    minecraftVersions: runtimeVersions(knownGoodSnapshots),
    candidates: candidates.filter((item) => item.status !== "rejected"),
    rejected: candidates.filter((item) => item.status === "rejected"),
  };
}
