import type {
  RuntimeObservationSnapshot,
} from "../../reliability/src/index.js";
import type {
  CampaignHistoryRecord,
} from "./campaign-history.js";
import type {
  MinedInvariantCandidate,
} from "./invariant-mining-types.js";

export interface InvariantChallengeInput {
  historicalFailures?: readonly RuntimeObservationSnapshot[];
  campaignHistory?: readonly CampaignHistoryRecord[];
  currentMinecraftVersion?: string;
}

function mutationOperatorsForCandidate(
  candidate: MinedInvariantCandidate,
): string[] {
  switch (candidate.kind) {
    case "player-phase-implies-connected":
      return ["disconnect-preserve-progress", "phase-skip"];
    case "player-phase-implies-arena":
      return ["selector-broaden", "tag-filter-omit", "phase-skip"];
    case "arena-cutscene-implies-starting-player":
      return ["shared-cutscene-lock", "phase-skip", "timing-shift"];
    case "disconnected-implies-zero-progress":
      return ["disconnect-preserve-progress", "reset-preserve-progress"];
    case "player-tag-implies-score":
      return ["tag-filter-omit", "scoreboard-objective-substitution"];
    case "playing-progress-nondecreasing":
      return ["reset-preserve-progress", "timing-shift"];
    case "entity-arena-tag-consistency":
      return ["tag-filter-omit"];
    case "entity-within-arena-region":
      return ["coordinate-shift", "timing-shift"];
  }
}

function insideCandidateRegion(
  candidate: MinedInvariantCandidate,
  position: { x: number; y: number; z: number },
): boolean | undefined {
  const p = candidate.parameters;
  if (!p) return undefined;
  const required = ["minX", "minY", "minZ", "maxX", "maxY", "maxZ"] as const;
  if (!required.every((key) => typeof p[key] === "number")) return undefined;

  return position.x >= Math.min(Number(p.minX), Number(p.maxX)) &&
    position.x <= Math.max(Number(p.minX), Number(p.maxX)) &&
    position.y >= Math.min(Number(p.minY), Number(p.maxY)) &&
    position.y <= Math.max(Number(p.minY), Number(p.maxY)) &&
    position.z >= Math.min(Number(p.minZ), Number(p.maxZ)) &&
    position.z <= Math.max(Number(p.minZ), Number(p.maxZ));
}

function snapshotContradicts(
  candidate: MinedInvariantCandidate,
  snapshot: RuntimeObservationSnapshot,
): string[] {
  const evidence: string[] = [];

  if (candidate.kind === "player-phase-implies-connected") {
    for (const player of snapshot.players) {
      if (
        player.phase &&
        ["assigned", "starting", "playing", "completed"].includes(player.phase) &&
        !player.connected
      ) evidence.push(`tick=${snapshot.tick ?? "?"},player=${player.playerId}`);
    }
  }

  if (candidate.kind === "player-phase-implies-arena") {
    for (const player of snapshot.players) {
      if (
        player.phase &&
        ["assigned", "starting", "playing", "completed"].includes(player.phase) &&
        !player.arenaId
      ) evidence.push(`tick=${snapshot.tick ?? "?"},player=${player.playerId}`);
    }
  }

  if (candidate.kind === "arena-cutscene-implies-starting-player") {
    for (const arena of snapshot.arenas) {
      if (!arena.cutsceneActive) continue;
      const match = snapshot.players.some((player) =>
        player.arenaId === arena.arenaId && player.phase === "starting",
      );
      if (!match) evidence.push(`tick=${snapshot.tick ?? "?"},arena=${arena.arenaId}`);
    }
  }

  if (candidate.kind === "disconnected-implies-zero-progress") {
    for (const player of snapshot.players) {
      if (!player.connected && player.progress !== undefined && player.progress !== 0) {
        evidence.push(`tick=${snapshot.tick ?? "?"},player=${player.playerId},progress=${player.progress}`);
      }
    }
  }

  if (candidate.kind === "player-tag-implies-score") {
    const tag = candidate.parameters?.tag;
    const objective = candidate.parameters?.objective;
    const relation = candidate.parameters?.relation;
    if (typeof tag === "string" && typeof objective === "string") {
      for (const player of snapshot.players) {
        if (!player.tags?.includes(tag)) continue;
        const value = player.scores?.[objective];
        const satisfied = relation === "nonzero"
          ? value !== undefined && value !== 0
          : value !== undefined;
        if (!satisfied) {
          evidence.push(`tick=${snapshot.tick ?? "?"},player=${player.playerId},tag=${tag},objective=${objective}`);
        }
      }
    }
  }

  if (candidate.kind === "entity-arena-tag-consistency") {
    for (const entity of snapshot.entities ?? []) {
      if (
        entity.arenaId &&
        entity.tags &&
        !entity.tags.includes(`arena:${entity.arenaId}`)
      ) {
        evidence.push(`tick=${snapshot.tick ?? "?"},entity=${entity.entityId},arena=${entity.arenaId}`);
      }
    }
  }

  if (candidate.kind === "entity-within-arena-region") {
    const arenaId = candidate.parameters?.arenaId;
    if (typeof arenaId === "string") {
      for (const entity of snapshot.entities ?? []) {
        if (entity.arenaId !== arenaId || !entity.position) continue;
        const inside = insideCandidateRegion(candidate, entity.position);
        if (inside === false) {
          evidence.push(`tick=${snapshot.tick ?? "?"},entity=${entity.entityId},arena=${arenaId}`);
        }
      }
    }
  }

  return evidence;
}

function transitionContradictions(
  candidate: MinedInvariantCandidate,
  snapshots: readonly RuntimeObservationSnapshot[],
): string[] {
  if (candidate.kind !== "playing-progress-nondecreasing") return [];

  const evidence: string[] = [];
  const ordered = [...snapshots]
    .filter((snapshot) => snapshot.tick !== undefined)
    .sort((a, b) => a.tick! - b.tick!);

  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1]!;
    const current = ordered[index]!;
    for (const player of current.players) {
      const before = previous.players.find((item) => item.playerId === player.playerId);
      if (
        player.phase === "playing" &&
        before?.phase === "playing" &&
        player.progress !== undefined &&
        before.progress !== undefined &&
        player.progress < before.progress
      ) {
        evidence.push(
          `ticks=${previous.tick}->${current.tick},player=${player.playerId},progress=${before.progress}->${player.progress}`,
        );
      }
    }
  }

  return evidence;
}

export function challengeMinedInvariants(
  candidates: readonly MinedInvariantCandidate[],
  input: InvariantChallengeInput,
): MinedInvariantCandidate[] {
  return candidates.map((candidate) => {
    const challenges: string[] = [...candidate.challengeEvidence];
    const failures = input.historicalFailures ?? [];

    for (const snapshot of failures) {
      for (const evidence of snapshotContradicts(candidate, snapshot)) {
        challenges.push(`historical-failure:${evidence}`);
      }
    }
    for (const evidence of transitionContradictions(candidate, failures)) {
      challenges.push(`historical-failure:${evidence}`);
    }

    const relevantOperators = new Set(mutationOperatorsForCandidate(candidate));
    for (const record of input.campaignHistory ?? []) {
      for (const result of record.mutationReport?.results ?? []) {
        if (
          result.status === "survived" &&
          relevantOperators.has(result.descriptor.operator)
        ) {
          challenges.push(
            `survived-mutation:${record.campaignId}:${result.descriptor.operator}`,
          );
        }
      }
    }

    const uniqueChallenges = [...new Set(challenges)].sort();

    if (
      input.currentMinecraftVersion &&
      candidate.minecraftVersions.length > 0 &&
      !candidate.minecraftVersions.includes(input.currentMinecraftVersion)
    ) {
      return {
        ...candidate,
        status: candidate.status === "supported" ? "stale" : candidate.status,
        challengeEvidence: [
          ...uniqueChallenges,
          `version-stale:mined=${candidate.minecraftVersions.join(",")}:current=${input.currentMinecraftVersion}`,
        ].sort(),
      };
    }

    return {
      ...candidate,
      status: uniqueChallenges.length > 0 && candidate.status === "supported"
        ? "challenged"
        : candidate.status,
      challengeEvidence: uniqueChallenges,
    };
  });
}
