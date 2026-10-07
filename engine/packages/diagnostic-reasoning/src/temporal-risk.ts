export type TemporalRiskFactor =
  | "async"
  | "global-state"
  | "retry"
  | "reload"
  | "reconnect"
  | "cleanup"
  | "shared-resource"
  | "capacity-boundary"
  | "delayed-callback"
  | "fallback"
  | "terminal-transition"
  | "presentation-transition"
  | "readiness-gate"
  | "phase-mutation"
  | "settlement";

export interface TemporalInteractionInput {
  readonly leftSystem: string;
  readonly rightSystem: string;
  readonly factors: readonly TemporalRiskFactor[];
}

export interface TemporalInteractionRisk {
  readonly leftSystem: string;
  readonly rightSystem: string;
  readonly factors: readonly TemporalRiskFactor[];
  readonly priority: "high" | "normal";
  readonly windows: readonly ("before" | "overlap" | "after")[];
}

const HIGH_RISK = new Set<TemporalRiskFactor>([
  "async",
  "global-state",
  "reload",
  "reconnect",
  "cleanup",
  "shared-resource",
  "capacity-boundary",
  "delayed-callback",
  "terminal-transition",
  "presentation-transition",
  "readiness-gate",
  "phase-mutation",
  "settlement",
]);

export function prioritizeTemporalInteraction(
  input: TemporalInteractionInput,
): TemporalInteractionRisk {
  const factors = [...new Set(input.factors)];
  const highCount = factors.filter((factor) =>
    HIGH_RISK.has(factor)
  ).length;

  return {
    leftSystem: input.leftSystem,
    rightSystem: input.rightSystem,
    factors,
    priority: highCount >= 2 ? "high" : "normal",
    windows: ["before", "overlap", "after"],
  };
}
