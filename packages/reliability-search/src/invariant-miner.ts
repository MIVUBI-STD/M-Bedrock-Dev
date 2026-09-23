import { createHash } from "node:crypto";
import type {
  RuntimeObservationSnapshot,
  SessionPhase,
} from "../../reliability/src/index.js";
import type {
  CandidateInvariantKind,
  InvariantMiningOptions,
  InvariantMiningResult,
  MinedInvariantCandidate,
} from "./invariant-mining-types.js";

interface CandidateAccumulator {
  kind: CandidateInvariantKind;
  description: string;
  observations: number;
  antecedentMatches: number;
  satisfied: number;
  counterexamples: number;
  evidence: string[];
  counterexampleEvidence: string[];
}

function candidateId(kind: CandidateInvariantKind): string {
  return "inv_candidate_" + createHash("sha256")
    .update(kind)
    .digest("hex")
    .slice(0, 16);
}

function addEvidence(list: string[], value: string): void {
  if (!list.includes(value) && list.length < 20) list.push(value);
}

function playerPhaseConnected(
  snapshots: readonly RuntimeObservationSnapshot[],
): CandidateAccumulator {
  const acc: CandidateAccumulator = {
    kind: "player-phase-implies-connected",
    description: "Players observed in active session phases are connected.",
    observations: snapshots.length,
    antecedentMatches: 0,
    satisfied: 0,
    counterexamples: 0,
    evidence: [],
    counterexampleEvidence: [],
  };
  const active = new Set<SessionPhase>(["assigned", "starting", "playing", "completed"]);

  for (const snapshot of snapshots) {
    for (const player of snapshot.players) {
      if (!player.phase || !active.has(player.phase)) continue;
      acc.antecedentMatches += 1;
      const label = `tick=${snapshot.tick ?? "?"},player=${player.playerId},phase=${player.phase}`;
      if (player.connected) {
        acc.satisfied += 1;
        addEvidence(acc.evidence, label);
      } else {
        acc.counterexamples += 1;
        addEvidence(acc.counterexampleEvidence, label);
      }
    }
  }
  return acc;
}

function playerPhaseArena(
  snapshots: readonly RuntimeObservationSnapshot[],
): CandidateAccumulator {
  const acc: CandidateAccumulator = {
    kind: "player-phase-implies-arena",
    description: "Players observed in active session phases have an arena assignment.",
    observations: snapshots.length,
    antecedentMatches: 0,
    satisfied: 0,
    counterexamples: 0,
    evidence: [],
    counterexampleEvidence: [],
  };
  const active = new Set<SessionPhase>(["assigned", "starting", "playing", "completed"]);

  for (const snapshot of snapshots) {
    for (const player of snapshot.players) {
      if (!player.phase || !active.has(player.phase)) continue;
      acc.antecedentMatches += 1;
      const label = `tick=${snapshot.tick ?? "?"},player=${player.playerId},phase=${player.phase}`;
      if (player.arenaId) {
        acc.satisfied += 1;
        addEvidence(acc.evidence, label);
      } else {
        acc.counterexamples += 1;
        addEvidence(acc.counterexampleEvidence, label);
      }
    }
  }
  return acc;
}

function cutsceneStartingPlayer(
  snapshots: readonly RuntimeObservationSnapshot[],
): CandidateAccumulator {
  const acc: CandidateAccumulator = {
    kind: "arena-cutscene-implies-starting-player",
    description: "An active arena cutscene coincides with at least one starting player assigned to that arena.",
    observations: snapshots.length,
    antecedentMatches: 0,
    satisfied: 0,
    counterexamples: 0,
    evidence: [],
    counterexampleEvidence: [],
  };

  for (const snapshot of snapshots) {
    for (const arena of snapshot.arenas) {
      if (arena.cutsceneActive !== true) continue;
      acc.antecedentMatches += 1;
      const matches = snapshot.players.some((player) =>
        player.arenaId === arena.arenaId && player.phase === "starting",
      );
      const label = `tick=${snapshot.tick ?? "?"},arena=${arena.arenaId}`;
      if (matches) {
        acc.satisfied += 1;
        addEvidence(acc.evidence, label);
      } else {
        acc.counterexamples += 1;
        addEvidence(acc.counterexampleEvidence, label);
      }
    }
  }
  return acc;
}

function disconnectedZeroProgress(
  snapshots: readonly RuntimeObservationSnapshot[],
): CandidateAccumulator {
  const acc: CandidateAccumulator = {
    kind: "disconnected-implies-zero-progress",
    description: "Disconnected players have zero observed active progress.",
    observations: snapshots.length,
    antecedentMatches: 0,
    satisfied: 0,
    counterexamples: 0,
    evidence: [],
    counterexampleEvidence: [],
  };

  for (const snapshot of snapshots) {
    for (const player of snapshot.players) {
      if (player.connected) continue;
      if (player.progress === undefined) continue;
      acc.antecedentMatches += 1;
      const label = `tick=${snapshot.tick ?? "?"},player=${player.playerId},progress=${player.progress}`;
      if (player.progress === 0) {
        acc.satisfied += 1;
        addEvidence(acc.evidence, label);
      } else {
        acc.counterexamples += 1;
        addEvidence(acc.counterexampleEvidence, label);
      }
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

  let status: MinedInvariantCandidate["status"] = "candidate";
  if (acc.counterexamples > 0) {
    status = "rejected";
  } else if (
    acc.antecedentMatches >= options.minAntecedentMatches &&
    confidence >= options.minConfidence
  ) {
    status = "supported";
  }

  return {
    id: candidateId(acc.kind),
    kind: acc.kind,
    description: acc.description,
    support: {
      observations: acc.observations,
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
  },
): InvariantMiningResult {
  const candidates = [
    playerPhaseConnected(knownGoodSnapshots),
    playerPhaseArena(knownGoodSnapshots),
    cutsceneStartingPlayer(knownGoodSnapshots),
    disconnectedZeroProgress(knownGoodSnapshots),
  ].map((acc) => finalize(acc, options));

  return {
    observations: knownGoodSnapshots.length,
    candidates: candidates.filter((item) => item.status !== "rejected"),
    rejected: candidates.filter((item) => item.status === "rejected"),
  };
}
