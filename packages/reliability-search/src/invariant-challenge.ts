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
  }
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
      ) {
        evidence.push(`tick=${snapshot.tick ?? "?"},player=${player.playerId}`);
      }
    }
  }

  if (candidate.kind === "player-phase-implies-arena") {
    for (const player of snapshot.players) {
      if (
        player.phase &&
        ["assigned", "starting", "playing", "completed"].includes(player.phase) &&
        !player.arenaId
      ) {
        evidence.push(`tick=${snapshot.tick ?? "?"},player=${player.playerId}`);
      }
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

  return evidence;
}

export function challengeMinedInvariants(
  candidates: readonly MinedInvariantCandidate[],
  input: InvariantChallengeInput,
): MinedInvariantCandidate[] {
  return candidates.map((candidate) => {
    const challenges: string[] = [...candidate.challengeEvidence];

    for (const snapshot of input.historicalFailures ?? []) {
      for (const evidence of snapshotContradicts(candidate, snapshot)) {
        challenges.push(`historical-failure:${evidence}`);
      }
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
    return {
      ...candidate,
      status: uniqueChallenges.length > 0 && candidate.status === "supported"
        ? "challenged"
        : candidate.status,
      challengeEvidence: uniqueChallenges,
    };
  });
}
