import type {
  LifecycleReleaseProof,
} from "../../../packages/behavior-model/src/lifecycle-proof.js";
import type {
  ScriptTerminalRaceEvidence,
} from "../../scripts/src/terminal-race-evidence.js";

export interface TerminalLifecycleFusion {
  disposition:
    | "safe-by-proof"
    | "candidate-race"
    | "confirmed-lifecycle-defect"
    | "needs-runtime";
  reasons: readonly string[];
  competingTargets: readonly string[];
}

export function fuseTerminalRaceWithLifecycle(
  races: readonly ScriptTerminalRaceEvidence[],
  lifecycle: LifecycleReleaseProof,
): TerminalLifecycleFusion {
  const competingTargets = [
    ...new Set(races.map((item) => item.target)),
  ].sort();

  if (
    races.length === 0 &&
    lifecycle.status === "proven"
  ) {
    return {
      disposition: "safe-by-proof",
      reasons: [
        "No competing terminal paths were found and lifecycle release is proven.",
      ],
      competingTargets,
    };
  }

  if (
    races.length > 0 &&
    lifecycle.status === "violated"
  ) {
    return {
      disposition: "confirmed-lifecycle-defect",
      reasons: [
        "Competing terminal execution paths coincide with a proven lifecycle release violation.",
      ],
      competingTargets,
    };
  }

  if (
    races.length > 0 &&
    lifecycle.status === "proven"
  ) {
    return {
      disposition: "candidate-race",
      reasons: [
        "Competing terminal paths exist, but arena release remains proven; duplicate rewards or side effects require separate runtime evidence.",
      ],
      competingTargets,
    };
  }

  return {
    disposition: "needs-runtime",
    reasons: [
      "Static evidence cannot establish the terminal outcome; generate a minimal runtime probe.",
    ],
    competingTargets,
  };
}
