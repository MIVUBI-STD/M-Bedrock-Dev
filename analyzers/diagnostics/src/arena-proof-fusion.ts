import type {
  ArenaCanonicalProof,
} from "../../topology/src/arena-canonical-proof.js";
import type {
  SpatialSemanticDiff,
} from "../../world-db/src/spatial-diff.js";

export interface ArenaProofFusion {
  disposition:
    | "proven-equivalent"
    | "candidate-divergence"
    | "confirmed-divergence"
    | "conflicted"
    | "unknown";
  reasons: readonly string[];
  gameplayDifferenceCount: number;
}

export function fuseArenaParityAndSpatialEvidence(
  canonical: ArenaCanonicalProof,
  spatial: SpatialSemanticDiff | undefined,
): ArenaProofFusion {
  const gameplayDifferenceCount =
    spatial?.gameplayDifferences ?? 0;

  if (canonical.status === "conflicted") {
    return {
      disposition: "conflicted",
      reasons: [
        "Arena evidence layers disagree; do not promote a defect until the conflict is resolved.",
      ],
      gameplayDifferenceCount,
    };
  }

  if (
    canonical.status === "proven-equivalent" &&
    gameplayDifferenceCount === 0
  ) {
    return {
      disposition: "proven-equivalent",
      reasons: [
        "Canonical arena proof is equivalent and no gameplay-relevant spatial differences were found.",
      ],
      gameplayDifferenceCount,
    };
  }

  if (
    canonical.status === "divergent" &&
    gameplayDifferenceCount > 0
  ) {
    return {
      disposition: "confirmed-divergence",
      reasons: [
        "Canonical parity divergence is corroborated by gameplay-relevant physical world differences.",
      ],
      gameplayDifferenceCount,
    };
  }

  if (
    canonical.status === "divergent" ||
    gameplayDifferenceCount > 0
  ) {
    return {
      disposition: "candidate-divergence",
      reasons: [
        "Only one evidence layer currently supports a gameplay divergence; runtime or authored-contract evidence is still required.",
      ],
      gameplayDifferenceCount,
    };
  }

  return {
    disposition: "unknown",
    reasons: [
      "Available arena evidence is insufficient to prove equivalence or a gameplay divergence.",
    ],
    gameplayDifferenceCount,
  };
}
