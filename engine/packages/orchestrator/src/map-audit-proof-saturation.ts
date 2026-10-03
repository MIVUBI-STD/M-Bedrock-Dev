import {
  classifyGameplayIssue,
  type GameplayIssueFailureDomain,
} from "../../diagnostic-reasoning/src/index.js";
import type {
  GameplayDefectResolution,
} from "./inspection/gameplay-defect-resolution.js";
import type {
  GameplayScenarioGraph,
} from "./inspection/gameplay-scenario-model.js";

export interface AuditProofSaturationCriterion {
  readonly id: string;
  readonly description: string;
  readonly satisfied: boolean;
  readonly evidenceIds: readonly string[];
}

export interface AuditProofSaturationAssessment {
  readonly policy: "minimum-sufficient-proof";
  readonly causalLinkId: string;
  readonly failureDomain: GameplayIssueFailureDomain;
  readonly universalCriteria:
    readonly AuditProofSaturationCriterion[];
  readonly familyCriteria: readonly string[];
  readonly saturated: boolean;
  readonly missingUniversalCriteriaIds: readonly string[];
  readonly stopRule: string;
}

const FAMILY_CRITERIA:
  Readonly<Record<GameplayIssueFailureDomain, readonly string[]>> = {
    "progression-wave-objective": [
      "Completion dependency is grounded.",
      "The failing/incorrect mutation or missing accounting path is reachable.",
      "No alternate reconciliation path repairs progression before player impact.",
    ],
    "arena-multi-arena": [
      "Arena ownership/capacity contract is grounded.",
      "The violating shared/global/capacity path is reachable under concurrent use.",
      "Isolation/admission/cleanup counter-proof is exhausted.",
    ],
    "inventory-economy": [
      "Item/currency identity and player/run scope are grounded.",
      "Competing grant/restore/consume path reachability is grounded.",
      "Mutual exclusion/idempotency/generation counter-proof is exhausted.",
    ],
    "temporal-async": [
      "Deferred work and eventual mutation are grounded.",
      "Owner/session/arena/phase can change before commit.",
      "Commit-time cancellation/generation revalidation is absent or contradicted.",
    ],
    "chunk-simulation": [
      "Gameplay-critical simulation dependency is grounded.",
      "Simulation ownership/readiness requirement is grounded.",
      "Applicable platform/resource constraint and missing/insufficient ownership are grounded.",
    ],
    "persistence-recovery": [
      "Persisted state identity, scope, and intended lifetime are grounded.",
      "Recovery/reset path is reachable.",
      "Missing/stale/duplicate restore outcome follows from the grounded lifecycle.",
    ],
    "state-ownership": [
      "Material state owner and writers are grounded.",
      "Conflicting/missing reset or exit path is reachable.",
      "No guard/ownership rule makes the wrong state unreachable.",
    ],
    "entity-ai-combat": [
      "Actor/combat lifecycle contract is grounded.",
      "Failing spawn/navigation/hurt/death/revive path is reachable.",
      "Player-visible gameplay dependency on that actor/lifecycle is grounded.",
    ],
    "world-structure-mutation": [
      "World/structure mutation contract and target scope are grounded.",
      "Incorrect ordering/residue/leakage path is reachable.",
      "Required cleanup/replacement/spatial containment is absent or contradicted.",
    ],
    "boundary-capacity": [
      "The intended/visible boundary is grounded.",
      "The effective implementation/platform limit is grounded.",
      "Below/at/above-boundary behavior yields a deterministic contradiction.",
    ],
    "player-lifecycle": [
      "Lifecycle transition and owning player/session state are grounded.",
      "The invalid join/leave/death/reconnect/recovery path is reachable.",
      "A valid recovery/reset alternative does not block the wrong state.",
    ],
    "ui-feedback-information": [
      "Player-facing information is grounded.",
      "Actual gameplay state/capability is independently grounded.",
      "The mismatch is reachable in the same player-facing condition.",
    ],
    "platform-performance": [
      "Exact selected-version platform constraint is grounded.",
      "A required gameplay dependency is affected by that constraint.",
      "The resulting player-visible degradation/limit is deterministically derived.",
    ],
  };

function nonEmpty(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function assessReadyResolutionSaturation(
  graph: GameplayScenarioGraph,
  resolution: GameplayDefectResolution,
): AuditProofSaturationAssessment {
  const link = graph.causalLinks.find(
    (item) => item.id === resolution.causalLinkId,
  );
  const scenario =
    link === undefined
      ? undefined
      : graph.scenarios.find(
          (item) => item.id === link.scenarioId,
        );

  const evidenceIds = [
    ...new Set([
      ...(link?.evidenceIds ?? []),
      ...(resolution.evidenceIds ?? []),
    ]),
  ].sort();

  const componentIds = [
    ...new Set([
      ...(link?.componentIds ?? []),
      ...(resolution.componentIds ?? []),
    ]),
  ].sort();

  const classification = classifyGameplayIssue({
    gameplayStage:
      scenario?.gameplayStage ?? "ACTIVE_GAMEPLAY",
    scenarioLabel:
      scenario?.label ?? resolution.scenarioId ?? "unknown",
    componentIds,
  });

  const counterProofIds =
    resolution.counterProofSearch?.evidenceIds ?? [];
  const counterProofCleared =
    resolution.counterProofSearch?.conclusion ===
      "NO_BLOCKING_PROOF" &&
    resolution.counterProofSearch
      .exhaustiveWithinScope === true;

  const universalCriteria:
    AuditProofSaturationCriterion[] = [
      {
        id: "scenario-grounded",
        description:
          "Finding is attached to one concrete gameplay scenario with selected-artifact components.",
        satisfied:
          scenario !== undefined &&
          scenario.componentIds.length > 0,
        evidenceIds,
      },
      {
        id: "contradiction-grounded",
        description:
          "Expected dependency and contradictory actual behavior are grounded.",
        satisfied:
          link?.status === "CONTRADICTED" &&
          nonEmpty(link.purpose) &&
          nonEmpty(link.reason),
        evidenceIds,
      },
      {
        id: "player-impact-translated",
        description:
          "Trigger and player-visible gameplay consequence are explicit.",
        satisfied:
          nonEmpty(resolution.gameplayTrigger) &&
          nonEmpty(resolution.gameplayConsequence),
        evidenceIds,
      },
      {
        id: "expected-actual-bound",
        description:
          "Expected and actual outcomes are explicitly bound.",
        satisfied:
          nonEmpty(resolution.expectedOutcome) &&
          nonEmpty(resolution.actualOutcome),
        evidenceIds,
      },
      {
        id: "scope-bound",
        description:
          "Affected gameplay/source scope is explicit.",
        satisfied:
          nonEmpty(resolution.affectedScope),
        evidenceIds,
      },
      {
        id: "evidence-bound",
        description:
          "At least one selected-artifact/analysis evidence id supports the contradiction.",
        satisfied: evidenceIds.length > 0,
        evidenceIds,
      },
      {
        id: "counter-proof-cleared",
        description:
          "Bounded counter-proof search is exhaustive in scope and found no blocking proof.",
        satisfied: counterProofCleared,
        evidenceIds: [...counterProofIds],
      },
    ];

  const missingUniversalCriteriaIds =
    universalCriteria
      .filter((item) => !item.satisfied)
      .map((item) => item.id)
      .sort();

  return {
    policy: "minimum-sufficient-proof",
    causalLinkId: resolution.causalLinkId,
    failureDomain:
      classification.failureDomain,
    universalCriteria,
    familyCriteria:
      FAMILY_CRITERIA[
        classification.failureDomain
      ],
    saturated:
      missingUniversalCriteriaIds.length === 0,
    missingUniversalCriteriaIds,
    stopRule:
      missingUniversalCriteriaIds.length === 0
        ? "Minimum universal proof is saturated. Do not request broader validation or runtime manifestation unless a family-specific claim is explicitly still unresolved."
        : "Continue only on the missing proof criteria. Do not broaden search into already-satisfied dimensions.",
  };
}
