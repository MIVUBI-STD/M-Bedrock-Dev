import type { ReliabilityInvariant } from "../../reliability/src/index.js";
import type { MinedInvariantCandidate } from "./invariant-mining-types.js";

export interface InvariantPromotionDraft {
  candidateId: string;
  eligible: boolean;
  reason: string;
  invariant?: ReliabilityInvariant;
}

export function draftInvariantPromotion(
  candidate: MinedInvariantCandidate,
): InvariantPromotionDraft {
  if (candidate.status !== "supported") {
    return {
      candidateId: candidate.id,
      eligible: false,
      reason: `Candidate status is ${candidate.status}; only unchallenged supported candidates may be drafted.`,
    };
  }

  const base = {
    domain: "multiplayer" as const,
    severity: "medium" as const,
    lanes: ["generative", "runtime"] as const,
    source: "project" as const,
  };

  switch (candidate.kind) {
    case "player-phase-implies-connected":
      return {
        candidateId: candidate.id,
        eligible: true,
        reason: "Candidate is supported and unchallenged.",
        invariant: {
          ...base,
          id: "candidate.player-phase-implies-connected",
          title: "Active session phase implies connected player",
          description: candidate.description,
          tags: ["candidate", "player", "connection", "phase"],
        },
      };
    case "player-phase-implies-arena":
      return {
        candidateId: candidate.id,
        eligible: true,
        reason: "Candidate is supported and unchallenged.",
        invariant: {
          ...base,
          id: "candidate.player-phase-implies-arena",
          title: "Active session phase implies arena assignment",
          description: candidate.description,
          tags: ["candidate", "player", "arena", "phase"],
        },
      };
    case "arena-cutscene-implies-starting-player":
      return {
        candidateId: candidate.id,
        eligible: true,
        reason: "Candidate is supported and unchallenged.",
        invariant: {
          ...base,
          id: "candidate.arena-cutscene-implies-starting-player",
          title: "Arena cutscene implies starting player",
          description: candidate.description,
          tags: ["candidate", "arena", "cutscene", "starting"],
        },
      };
    case "disconnected-implies-zero-progress":
      return {
        candidateId: candidate.id,
        eligible: true,
        reason: "Candidate is supported and unchallenged.",
        invariant: {
          ...base,
          id: "candidate.disconnected-implies-zero-progress",
          title: "Disconnected player has zero active progress",
          description: candidate.description,
          tags: ["candidate", "disconnect", "progress"],
        },
      };
  }
}
