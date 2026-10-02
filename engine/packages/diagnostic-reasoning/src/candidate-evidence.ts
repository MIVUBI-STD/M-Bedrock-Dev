import type {
  GameplayContract,
} from "../../gameplay-intent/src/index.js";
import type {
  DiagnosticEvidenceObservation,
  DiagnosticEvidenceState,
} from "./types.js";

export const GAMEPLAY_BUG_CANDIDATE_KINDS = [
  "contract-contradiction",
  "progression-dead-end",
  "objective-loss",
  "reset-leakage",
  "terminal-state-conflict",
  "multiplayer-ownership-conflict",
  "critical-inventory-loss",
  "entity-route-dead-end",
] as const;

export type GameplayBugCandidateKind =
  (typeof GAMEPLAY_BUG_CANDIDATE_KINDS)[number];

export interface GameplayBugCandidateRule {
  readonly id: string;
  readonly kind: GameplayBugCandidateKind;
  readonly scopeSubjectIds?: readonly string[];
  readonly requiredPredicates: readonly string[];
  readonly anyOfPredicates?: readonly string[];
  readonly playerImpactPredicates: readonly string[];
  /**
   * Explanatory alternatives only. Presence never suppresses a candidate.
   * Use blockingCounterEvidencePredicates only for proof that makes the
   * wrong gameplay state unreachable.
   */
  readonly counterEvidencePredicates?: readonly string[];
  readonly blockingCounterEvidencePredicates?: readonly string[];
}

export type GameplayBugCandidateEvidenceDisposition =
  | "candidate"
  | "contract-missing"
  | "contract-blocked"
  | "suppressed-by-counter-evidence"
  | "counter-evidence-unresolved"
  | "no-player-impact"
  | "insufficient-evidence"
  | "not-matched";

export interface GameplayBugCandidateEvidenceResult {
  readonly ruleId: string;
  readonly kind: GameplayBugCandidateKind;
  readonly disposition: GameplayBugCandidateEvidenceDisposition;
  readonly supportingEvidenceIds: readonly string[];
  readonly playerImpactEvidenceIds: readonly string[];
  readonly counterEvidenceIds: readonly string[];
  readonly unresolvedCounterPredicates: readonly string[];
  readonly missingPredicates: readonly string[];
  readonly reasons: readonly string[];
}

function latestEvidence(
  items: readonly DiagnosticEvidenceObservation[],
): ReadonlyMap<string, DiagnosticEvidenceObservation> {
  const map = new Map<string, DiagnosticEvidenceObservation>();
  for (const item of items) {
    map.set(item.predicate, item);
  }
  return map;
}

function stateOf(
  byPredicate: ReadonlyMap<string, DiagnosticEvidenceObservation>,
  predicate: string,
): DiagnosticEvidenceState {
  return byPredicate.get(predicate)?.state ?? "unknown";
}

function evidenceId(
  item: DiagnosticEvidenceObservation,
): string {
  return item.evidenceId ??
    "predicate:" + item.predicate + ":" + item.state;
}

export function evaluateGameplayBugCandidateEvidence(
  rule: GameplayBugCandidateRule,
  evidence: readonly DiagnosticEvidenceObservation[],
  gameplayContract?: GameplayContract,
): GameplayBugCandidateEvidenceResult {
  if (gameplayContract === undefined) {
    return {
      ruleId: rule.id,
      kind: rule.kind,
      disposition: "contract-missing",
      supportingEvidenceIds: [],
      playerImpactEvidenceIds: [],
      counterEvidenceIds: [],
      unresolvedCounterPredicates: [],
      missingPredicates: [],
      reasons: [
        "Gameplay bug candidate discovery requires a matching selected-artifact Gameplay Contract.",
      ],
    };
  }

  if (gameplayContract.readiness.disposition === "blocked") {
    return {
      ruleId: rule.id,
      kind: rule.kind,
      disposition: "contract-blocked",
      supportingEvidenceIds: [],
      playerImpactEvidenceIds: [],
      counterEvidenceIds: [],
      unresolvedCounterPredicates: [],
      missingPredicates: [],
      reasons: [
        ...gameplayContract.readiness.reasons,
        "Do not classify gameplay defects while the selected-artifact Gameplay Contract is blocked.",
      ],
    };
  }

  const requiredScope =
    rule.scopeSubjectIds ?? [];
  if (
    requiredScope.some(
      (subjectId) =>
        !gameplayContract.subjectIds.includes(subjectId),
    )
  ) {
    return {
      ruleId: rule.id,
      kind: rule.kind,
      disposition: "contract-missing",
      supportingEvidenceIds: [],
      playerImpactEvidenceIds: [],
      counterEvidenceIds: [],
      unresolvedCounterPredicates: [],
      missingPredicates: [],
      reasons: [
        "Gameplay Contract does not cover the candidate rule scope.",
      ],
    };
  }

  const byPredicate = latestEvidence(evidence);

  const counterEvidenceIds: string[] = [];
  const unresolvedCounterPredicates: string[] = [];

  for (
    const predicate of
      rule.blockingCounterEvidencePredicates ?? []
  ) {
    const item = byPredicate.get(predicate);
    if (!item || item.state === "unknown") {
      unresolvedCounterPredicates.push(predicate);
      continue;
    }
    if (item.state === "present") {
      counterEvidenceIds.push(evidenceId(item));
    }
  }

  if (counterEvidenceIds.length > 0) {
    return {
      ruleId: rule.id,
      kind: rule.kind,
      disposition: "suppressed-by-counter-evidence",
      supportingEvidenceIds: [],
      playerImpactEvidenceIds: [],
      counterEvidenceIds: [...new Set(counterEvidenceIds)].sort(),
      unresolvedCounterPredicates:
        [...new Set(unresolvedCounterPredicates)].sort(),
      missingPredicates: [],
      reasons: [
        "Blocking counter-proof demonstrates that the wrong gameplay state is unreachable. Explanatory or plausible alternatives do not suppress candidates.",
      ],
    };
  }

  if (unresolvedCounterPredicates.length > 0) {
    return {
      ruleId: rule.id,
      kind: rule.kind,
      disposition: "counter-evidence-unresolved",
      supportingEvidenceIds: [],
      playerImpactEvidenceIds: [],
      counterEvidenceIds: [],
      unresolvedCounterPredicates:
        [...new Set(unresolvedCounterPredicates)].sort(),
      missingPredicates: [],
      reasons: [
        "Required counter-evidence checks are unresolved; do not promote the candidate yet.",
      ],
    };
  }

  const missingRequired = rule.requiredPredicates.filter(
    (predicate) => stateOf(byPredicate, predicate) === "unknown",
  );

  if (missingRequired.length > 0) {
    return {
      ruleId: rule.id,
      kind: rule.kind,
      disposition: "insufficient-evidence",
      supportingEvidenceIds: [],
      playerImpactEvidenceIds: [],
      counterEvidenceIds: [],
      unresolvedCounterPredicates: [],
      missingPredicates: [...missingRequired].sort(),
      reasons: [
        "One or more required candidate predicates are unknown.",
      ],
    };
  }

  if (
    rule.requiredPredicates.some(
      (predicate) =>
        stateOf(byPredicate, predicate) !== "present",
    )
  ) {
    return {
      ruleId: rule.id,
      kind: rule.kind,
      disposition: "not-matched",
      supportingEvidenceIds: [],
      playerImpactEvidenceIds: [],
      counterEvidenceIds: [],
      unresolvedCounterPredicates: [],
      missingPredicates: [],
      reasons: [
        "The required evidence pattern is not present.",
      ],
    };
  }

  if ((rule.anyOfPredicates?.length ?? 0) > 0) {
    const anyPresent = rule.anyOfPredicates!.some(
      (predicate) =>
        stateOf(byPredicate, predicate) === "present",
    );
    if (!anyPresent) {
      const unknown = rule.anyOfPredicates!.filter(
        (predicate) =>
          stateOf(byPredicate, predicate) === "unknown",
      );
      return {
        ruleId: rule.id,
        kind: rule.kind,
        disposition:
          unknown.length > 0
            ? "insufficient-evidence"
            : "not-matched",
        supportingEvidenceIds: [],
        playerImpactEvidenceIds: [],
        counterEvidenceIds: [],
        unresolvedCounterPredicates: [],
        missingPredicates: [...unknown].sort(),
        reasons: [
          unknown.length > 0
            ? "No alternative candidate predicate is proven and at least one remains unknown."
            : "No alternative candidate predicate is present.",
        ],
      };
    }
  }

  const impactPresent = rule.playerImpactPredicates
    .map((predicate) => byPredicate.get(predicate))
    .filter(
      (
        item,
      ): item is DiagnosticEvidenceObservation =>
        item?.state === "present",
    );

  if (impactPresent.length === 0) {
    const impactUnknown = rule.playerImpactPredicates.filter(
      (predicate) =>
        stateOf(byPredicate, predicate) === "unknown",
    );

    return {
      ruleId: rule.id,
      kind: rule.kind,
      disposition:
        impactUnknown.length > 0
          ? "insufficient-evidence"
          : "no-player-impact",
      supportingEvidenceIds: [],
      playerImpactEvidenceIds: [],
      counterEvidenceIds: [],
      unresolvedCounterPredicates: [],
      missingPredicates: [...impactUnknown].sort(),
      reasons: [
        impactUnknown.length > 0
          ? "Player-visible gameplay impact is not yet grounded."
          : "The pattern exists but has no material player-visible gameplay impact.",
      ],
    };
  }

  const support = [
    ...rule.requiredPredicates,
    ...(rule.anyOfPredicates ?? []),
  ]
    .map((predicate) => byPredicate.get(predicate))
    .filter(
      (
        item,
      ): item is DiagnosticEvidenceObservation =>
        item?.state === "present",
    )
    .map(evidenceId);

  return {
    ruleId: rule.id,
    kind: rule.kind,
    disposition: "candidate",
    supportingEvidenceIds: [...new Set(support)].sort(),
    playerImpactEvidenceIds: [
      ...new Set(impactPresent.map(evidenceId)),
    ].sort(),
    counterEvidenceIds: [],
    unresolvedCounterPredicates: [],
    missingPredicates: [],
    reasons: [
      "Required behavior evidence and material player impact are present, and no blocking counter-proof makes the wrong gameplay state unreachable.",
    ],
  };
}
