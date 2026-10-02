export type AuditRiskFactor =
  | "shared-state"
  | "multiplayer"
  | "async"
  | "persistence"
  | "reload"
  | "reconnect"
  | "capacity"
  | "permission"
  | "world-mutation"
  | "terminal-transition"
  | "fallback"
  | "external-runtime-dependency"
  | "replica-integrity";

export interface AuditRiskInput {
  readonly surfaceId: string;
  readonly factors:
    readonly AuditRiskFactor[];
  readonly unresolved?: boolean;
}

export interface AuditRiskAssessment {
  readonly surfaceId: string;
  readonly factors:
    readonly AuditRiskFactor[];
  readonly score: number;
  readonly priority:
    | "low"
    | "medium"
    | "high";
  readonly proofDepth:
    | "static"
    | "targeted"
    | "deep";
}

const WEIGHTS:
  Readonly<Record<AuditRiskFactor, number>> = {
    "shared-state": 2,
    multiplayer: 2,
    async: 2,
    persistence: 2,
    reload: 3,
    reconnect: 3,
    capacity: 2,
    permission: 3,
    "world-mutation": 2,
    "terminal-transition": 2,
    fallback: 2,
    "external-runtime-dependency": 2,
    "replica-integrity": 2,
  };

export function assessAuditRisk(
  input: AuditRiskInput,
): AuditRiskAssessment {
  const factors = [
    ...new Set(input.factors),
  ].sort();
  const score =
    factors.reduce(
      (sum, factor) =>
        sum + WEIGHTS[factor],
      0,
    ) +
    (input.unresolved ? 2 : 0);

  const priority =
    score >= 6
      ? "high" as const
      : score >= 3
        ? "medium" as const
        : "low" as const;

  return {
    surfaceId: input.surfaceId,
    factors,
    score,
    priority,
    proofDepth:
      priority === "high"
        ? "deep"
        : priority === "medium"
          ? "targeted"
          : "static",
  };
}
