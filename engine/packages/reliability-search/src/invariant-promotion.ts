import type {
  ReliabilityInvariant,
} from "../../reliability/src/index.js";
import type {
  InvariantFalsificationReceipt,
} from "./invariant-falsification.js";
import type {
  MinedInvariantCandidate,
} from "./invariant-mining-types.js";

export interface InvariantPromotionDraft {
  candidateId: string;
  eligible: boolean;
  reason: string;
  invariant?: ReliabilityInvariant;
}

export function draftInvariantPromotion(
  candidate: MinedInvariantCandidate,
  falsification?:
    InvariantFalsificationReceipt,
): InvariantPromotionDraft {
  if (candidate.status !== "supported") {
    return {
      candidateId: candidate.id,
      eligible: false,
      reason:
        "Candidate status is " +
        candidate.status +
        "; only supported candidates may enter promotion.",
    };
  }

  if (!falsification) {
    return {
      candidateId: candidate.id,
      eligible: false,
      reason:
        "Promotion requires an explicit adversarial falsification receipt.",
    };
  }

  if (
    falsification.candidateId !==
      candidate.id
  ) {
    return {
      candidateId: candidate.id,
      eligible: false,
      reason:
        "Falsification receipt belongs to a different candidate.",
    };
  }

  if (
    falsification.disposition !==
      "passed"
  ) {
    return {
      candidateId: candidate.id,
      eligible: false,
      reason:
        "Adversarial falsification disposition is " +
        falsification.disposition +
        ".",
    };
  }

  const base = {
    domain: "multiplayer" as const,
    severity: "medium" as const,
    lanes: [
      "generative",
      "runtime",
    ] as const,
    source: "project" as const,
  };

  const id =
    "candidate." +
    candidate.kind +
    "." +
    candidate.id.slice(-8);

  return {
    candidateId: candidate.id,
    eligible: true,
    reason:
      "Candidate is supported and has passed explicit adversarial falsification.",
    invariant: {
      ...base,
      id,
      title: candidate.description,
      description:
        candidate.description,
      tags: [
        "candidate",
        "adversarially-falsified",
        candidate.kind,
        ...Object.entries(
          candidate.parameters ?? {},
        ).map(
          ([key, value]) =>
            key +
            "=" +
            String(value),
        ),
      ],
    },
  };
}
