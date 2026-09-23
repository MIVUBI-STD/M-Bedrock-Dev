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

  const id = `candidate.${candidate.kind}.${candidate.id.slice(-8)}`;
  return {
    candidateId: candidate.id,
    eligible: true,
    reason: "Candidate is supported, diverse enough, version-current, and unchallenged.",
    invariant: {
      ...base,
      id,
      title: candidate.description,
      description: candidate.description,
      tags: [
        "candidate",
        candidate.kind,
        ...Object.entries(candidate.parameters ?? {}).map(([key, value]) =>
          `${key}=${String(value)}`,
        ),
      ],
    },
  };
}
