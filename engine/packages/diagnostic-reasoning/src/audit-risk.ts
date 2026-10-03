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

export type AuditGameplayCriticality =
  | "low"
  | "medium"
  | "high"
  | "blocker";

export interface AuditRiskInput {
  readonly surfaceId: string;
  readonly factors:
    readonly AuditRiskFactor[];
  readonly unresolved?: boolean;
  /**
   * Gameplay impact if this surface fails. This is intentionally separate
   * from technical complexity so a simple completion/terminal dependency
   * can never be deprioritized merely because it has few risk factors.
   */
  readonly criticality?: AuditGameplayCriticality;
}

export interface AuditRiskAssessment {
  readonly surfaceId: string;
  readonly factors:
    readonly AuditRiskFactor[];
  readonly technicalRiskScore: number;
  readonly criticality: AuditGameplayCriticality;
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

const CRITICALITY_FLOOR:
  Readonly<Record<AuditGameplayCriticality, number>> = {
    low: 0,
    medium: 3,
    high: 6,
    blocker: 8,
  };

export function assessAuditRisk(
  input: AuditRiskInput,
): AuditRiskAssessment {
  const factors = [
    ...new Set(input.factors),
  ].sort();
  const technicalRiskScore =
    factors.reduce(
      (sum, factor) =>
        sum + WEIGHTS[factor],
      0,
    ) +
    (input.unresolved ? 2 : 0);
  const criticality = input.criticality ?? "low";

  // Risk depth must never fall below gameplay criticality. This prevents
  // low-complexity but progression-blocking mechanics from receiving only
  // shallow/static proof.
  const score = Math.max(
    technicalRiskScore,
    CRITICALITY_FLOOR[criticality],
  );

  const priority =
    score >= 6
      ? "high" as const
      : score >= 3
        ? "medium" as const
        : "low" as const;

  return {
    surfaceId: input.surfaceId,
    factors,
    technicalRiskScore,
    criticality,
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
