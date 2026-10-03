import type {
  GameplayIssueFailureDomain,
} from "../../diagnostic-reasoning/src/index.js";
import type {
  NeedValidationAuditIssueProjection,
} from "./map-audit-issue-projection.js";

export interface AuditProofNavigationStep {
  readonly order: number;
  readonly knowledgeDomain: string;
  readonly question: string;
  readonly purpose: string;
  readonly evidencePreference:
    | "selected-artifact"
    | "cross-domain"
    | "formal"
    | "runtime";
}

export interface AuditProofNavigation {
  readonly recipeId: string;
  readonly proofGoal: string;
  readonly provenClaims: readonly string[];
  readonly missingClaims: readonly string[];
  readonly route: readonly AuditProofNavigationStep[];
  readonly runtimeLastResort: boolean;
}

interface ProofRecipe {
  readonly id: string;
  readonly goal: string;
  readonly route: readonly Omit<AuditProofNavigationStep, "order">[];
}

const RECIPES: Readonly<Record<GameplayIssueFailureDomain, ProofRecipe>> = {
  "progression-wave-objective": {
    id: "proof:progression-dead-end",
    goal:
      "Prove or disprove a reachable state where required progression cannot correctly advance or terminate.",
    route: [
      {
        knowledgeDomain: "state-flow",
        question:
          "What exact state/counter/objective gates progression and which paths mutate it?",
        purpose:
          "Establish the completion dependency and every reachable mutation path.",
        evidencePreference: "selected-artifact",
      },
      {
        knowledgeDomain: "entity-behavior",
        question:
          "Can required actors terminate, unload, despawn, or fail without the progression tracker being reconciled?",
        purpose:
          "Find alternate actor lifecycle paths that can strand progression.",
        evidencePreference: "cross-domain",
      },
      {
        knowledgeDomain: "chunk-simulation",
        question:
          "Does progression depend on actors/world logic outside guaranteed simulation ownership?",
        purpose:
          "Replace broad runtime uncertainty with simulation ownership evidence when possible.",
        evidencePreference: "cross-domain",
      },
      {
        knowledgeDomain: "runtime",
        question:
          "Can the exact unresolved progression state be observed in Minecraft?",
        purpose:
          "Use one narrow observation only if source/cross-domain proof cannot decide the claim.",
        evidencePreference: "runtime",
      },
    ],
  },
  "arena-multi-arena": {
    id: "proof:arena-concurrency-isolation",
    goal:
      "Prove or disprove that concurrent arenas preserve advertised capacity, ownership, isolation, and cleanup.",
    route: [
      {
        knowledgeDomain: "arena-lifecycle",
        question:
          "How are arena membership, ownership, admission, cleanup, and reuse scoped?",
        purpose:
          "Establish the arena ownership contract.",
        evidencePreference: "selected-artifact",
      },
      {
        knowledgeDomain: "multiplayer-interleaving",
        question:
          "Can one arena mutate players/state/entities/world effects owned by another arena?",
        purpose:
          "Search cross-arena write/select/isolation violations.",
        evidencePreference: "cross-domain",
      },
      {
        knowledgeDomain: "chunk-simulation",
        question:
          "Do shared simulation resources reduce actual concurrent capacity below visible capacity?",
        purpose:
          "Resolve resource-bound capacity without assuming a two-arena pass generalizes.",
        evidencePreference: "cross-domain",
      },
      {
        knowledgeDomain: "runtime",
        question:
          "At the unresolved boundary, can all required arenas progress independently?",
        purpose:
          "Observe only the irreducible concurrency boundary.",
        evidencePreference: "runtime",
      },
    ],
  },
  "inventory-economy": {
    id: "proof:inventory-reward-lifecycle",
    goal:
      "Prove or disprove item/currency loss, duplication, wrong ownership, or non-idempotent delivery.",
    route: [
      {
        knowledgeDomain: "inventory-state",
        question:
          "Which paths grant, clear, restore, drop, consume, or equip the same player/item scope?",
        purpose:
          "Enumerate competing lifecycle writers.",
        evidencePreference: "selected-artifact",
      },
      {
        knowledgeDomain: "persistence-recovery",
        question:
          "Can reconnect/reload restore the same item or currency after another grant path already committed?",
        purpose:
          "Find duplicate or missing restore ownership.",
        evidencePreference: "cross-domain",
      },
      {
        knowledgeDomain: "economy-reward",
        question:
          "Are reward delivery and consume/idempotency semantics deterministic across terminal and retry paths?",
        purpose:
          "Prove one-time entitlement and delivery.",
        evidencePreference: "cross-domain",
      },
      {
        knowledgeDomain: "runtime",
        question:
          "Does the exact unresolved lifecycle produce missing or duplicated player inventory/reward state?",
        purpose:
          "Use a single targeted lifecycle observation as last resort.",
        evidencePreference: "runtime",
      },
    ],
  },
  "temporal-async": {
    id: "proof:stale-async-mutation",
    goal:
      "Prove or disprove that deferred work can commit after its owner/session/arena/phase generation changes.",
    route: [
      {
        knowledgeDomain: "temporal-ownership",
        question:
          "Who schedules the work, what owner/generation existed then, and what mutation commits later?",
        purpose:
          "Bind deferred work to an explicit owner and generation.",
        evidencePreference: "selected-artifact",
      },
      {
        knowledgeDomain: "state-flow",
        question:
          "Can cleanup, retry, reconnect, terminal, or reuse change ownership before commit?",
        purpose:
          "Establish a reachable stale-commit window.",
        evidencePreference: "cross-domain",
      },
      {
        knowledgeDomain: "formal",
        question:
          "Can bounded state/interleaving search produce a counterexample ordering?",
        purpose:
          "Prefer deterministic ordering proof before live timing reproduction.",
        evidencePreference: "formal",
      },
      {
        knowledgeDomain: "runtime",
        question:
          "Can the unresolved callback commit across before/overlap/after timing windows?",
        purpose:
          "Observe only irreducible engine scheduling behavior.",
        evidencePreference: "runtime",
      },
    ],
  },
  "chunk-simulation": {
    id: "proof:simulation-residency",
    goal:
      "Prove or disprove whether gameplay-critical actors/world logic remain simulated for the full required lifecycle.",
    route: [
      {
        knowledgeDomain: "chunk-simulation",
        question:
          "What gameplay dependency requires residency, who acquires it, when is readiness proven, and who releases it?",
        purpose:
          "Establish explicit simulation ownership.",
        evidencePreference: "selected-artifact",
      },
      {
        knowledgeDomain: "platform-constraints",
        question:
          "What selected-version simulation/capacity constraint applies to the dependency?",
        purpose:
          "Substitute documented platform constraints for unnecessary runtime trial.",
        evidencePreference: "cross-domain",
      },
      {
        knowledgeDomain: "entity-behavior",
        question:
          "What player-visible progression depends on the remote actor/world region?",
        purpose:
          "Bind simulation failure to concrete gameplay consequence.",
        evidencePreference: "cross-domain",
      },
      {
        knowledgeDomain: "runtime",
        question:
          "Does the exact unresolved actor/region stop simulating under the required scenario?",
        purpose:
          "Use one narrow residency observation only when still irreducible.",
        evidencePreference: "runtime",
      },
    ],
  },
  "persistence-recovery": {
    id: "proof:persistence-recovery",
    goal:
      "Prove or disprove stale, missing, duplicated, or wrongly restored state across disconnect/reconnect/reload/retry.",
    route: [
      {
        knowledgeDomain: "persistence-recovery",
        question:
          "What state persists, what identity/scope owns it, and what restore/reset path consumes it?",
        purpose:
          "Establish save/restore/reset semantics.",
        evidencePreference: "selected-artifact",
      },
      {
        knowledgeDomain: "state-flow",
        question:
          "Can persisted state outlive its intended round/match/session lifetime?",
        purpose:
          "Find over-persistence and under-reset paths.",
        evidencePreference: "cross-domain",
      },
      {
        knowledgeDomain: "temporal-ownership",
        question:
          "Can pending work restore stale state after a newer lifecycle already started?",
        purpose:
          "Resolve persistence × async races.",
        evidencePreference: "cross-domain",
      },
      {
        knowledgeDomain: "runtime",
        question:
          "Does the exact unresolved recovery transition restore the expected state once?",
        purpose:
          "Observe only irreducible engine persistence behavior.",
        evidencePreference: "runtime",
      },
    ],
  },
  "state-ownership": {
    id: "proof:state-ownership-lifecycle",
    goal:
      "Prove or disprove that material state has one valid owner, bounded writers, and complete reset/exit semantics.",
    route: [
      {
        knowledgeDomain: "state-flow",
        question:
          "Who creates, reads, writes, clears, and transitions this state?",
        purpose:
          "Build the authoritative state lifecycle.",
        evidencePreference: "selected-artifact",
      },
      {
        knowledgeDomain: "arena-lifecycle",
        question:
          "Is state scoped to player/arena/run or accidentally shared?",
        purpose:
          "Resolve shared-state ownership when multiplayer/arena context exists.",
        evidencePreference: "cross-domain",
      },
      {
        knowledgeDomain: "temporal-ownership",
        question:
          "Can a stale writer commit after state ownership changes?",
        purpose:
          "Resolve generation and deferred-writer risk.",
        evidencePreference: "cross-domain",
      },
      {
        knowledgeDomain: "runtime",
        question:
          "Does the unresolved state actually leak/block/reset incorrectly in the target transition?",
        purpose:
          "Observe only the remaining irreducible state behavior.",
        evidencePreference: "runtime",
      },
    ],
  },
  "entity-ai-combat": {
    id: "proof:entity-combat-lifecycle",
    goal:
      "Prove or disprove actor spawn/navigation/combat/death/revive lifecycle contradictions that affect gameplay.",
    route: [
      {
        knowledgeDomain: "entity-behavior",
        question:
          "Can the actor spawn, target, navigate, terminate, and be accounted on every required path?",
        purpose:
          "Establish actor lifecycle completeness.",
        evidencePreference: "selected-artifact",
      },
      {
        knowledgeDomain: "combat-lifecycle",
        question:
          "Can hurt/downed/revive/death/respawn paths overlap or commit in the wrong order?",
        purpose:
          "Resolve combat terminal and recovery ownership.",
        evidencePreference: "cross-domain",
      },
      {
        knowledgeDomain: "chunk-simulation",
        question:
          "Can unload/residency behavior invalidate actor progression semantics?",
        purpose:
          "Resolve actor × simulation interaction.",
        evidencePreference: "cross-domain",
      },
      {
        knowledgeDomain: "runtime",
        question:
          "Does the exact unresolved actor path fail in Minecraft?",
        purpose:
          "Observe engine-only navigation/physics/runtime residue.",
        evidencePreference: "runtime",
      },
    ],
  },
  "world-structure-mutation": {
    id: "proof:world-mutation-lifecycle",
    goal:
      "Prove or disprove incorrect world/structure mutation, ordering, containment, or cleanup.",
    route: [
      {
        knowledgeDomain: "world-structure",
        question:
          "What structure/world mutation is applied, in what order, and what previous state must be cleared/replaced?",
        purpose:
          "Establish mutation and transition semantics.",
        evidencePreference: "selected-artifact",
      },
      {
        knowledgeDomain: "spatial-authority",
        question:
          "Is the mutation contained to the intended arena/plot/region?",
        purpose:
          "Resolve spatial leakage and wrong-target mutation.",
        evidencePreference: "cross-domain",
      },
      {
        knowledgeDomain: "state-flow",
        question:
          "Can progression advance before the mutation is ready or after stale residue remains?",
        purpose:
          "Bind world mutation to gameplay state.",
        evidencePreference: "cross-domain",
      },
      {
        knowledgeDomain: "runtime",
        question:
          "Does the exact unresolved placement/load/cleanup produce the wrong playable world state?",
        purpose:
          "Observe only engine-dependent placement behavior.",
        evidencePreference: "runtime",
      },
    ],
  },
  "boundary-capacity": {
    id: "proof:boundary-contract",
    goal:
      "Prove or disprove incorrect below/at/above-boundary behavior for a material gameplay limit.",
    route: [
      {
        knowledgeDomain: "state-flow",
        question:
          "What value is the boundary, what transition depends on it, and what should happen at N-1/N/N+1?",
        purpose:
          "Extract the boundary contract.",
        evidencePreference: "selected-artifact",
      },
      {
        knowledgeDomain: "platform-constraints",
        question:
          "Is the effective boundary reduced by a selected-version platform/resource constraint?",
        purpose:
          "Resolve implementation versus platform capacity.",
        evidencePreference: "cross-domain",
      },
      {
        knowledgeDomain: "formal",
        question:
          "Can arithmetic/config/state constraints prove the boundary violation without runtime?",
        purpose:
          "Prefer deterministic quantitative proof.",
        evidencePreference: "formal",
      },
      {
        knowledgeDomain: "runtime",
        question:
          "At the unresolved boundary, does actual behavior match the grounded contract?",
        purpose:
          "Observe only the final irreducible boundary.",
        evidencePreference: "runtime",
      },
    ],
  },
  "player-lifecycle": {
    id: "proof:player-lifecycle",
    goal:
      "Prove or disprove invalid player state across join/leave/death/respawn/disconnect/reconnect/recovery.",
    route: [
      {
        knowledgeDomain: "state-flow",
        question:
          "What player/session state changes at each lifecycle event and who owns the transition?",
        purpose:
          "Establish lifecycle state ownership.",
        evidencePreference: "selected-artifact",
      },
      {
        knowledgeDomain: "persistence-recovery",
        question:
          "What state is intentionally preserved or reset across reconnect/reload?",
        purpose:
          "Resolve recovery semantics.",
        evidencePreference: "cross-domain",
      },
      {
        knowledgeDomain: "inventory-state",
        question:
          "Do loadout/equipment/reward states follow the same lifecycle contract?",
        purpose:
          "Resolve player lifecycle × inventory interactions.",
        evidencePreference: "cross-domain",
      },
      {
        knowledgeDomain: "runtime",
        question:
          "Does the exact lifecycle transition return the player to one valid state?",
        purpose:
          "Observe only irreducible lifecycle behavior.",
        evidencePreference: "runtime",
      },
    ],
  },
  "ui-feedback-information": {
    id: "proof:player-information-contract",
    goal:
      "Prove or disprove that player-facing information matches actual gameplay state/capability.",
    route: [
      {
        knowledgeDomain: "state-flow",
        question:
          "What actual state/capability is communicated to the player?",
        purpose:
          "Ground the source of truth behind the UI/message.",
        evidencePreference: "selected-artifact",
      },
      {
        knowledgeDomain: "ui-feedback",
        question:
          "What text/form/HUD/message is actually presented and under what condition?",
        purpose:
          "Compare presented versus actual gameplay information.",
        evidencePreference: "cross-domain",
      },
      {
        knowledgeDomain: "runtime",
        question:
          "Is the unresolved UI state actually visible/misleading in the client?",
        purpose:
          "Observe rendering/visibility only when source evidence cannot decide it.",
        evidencePreference: "runtime",
      },
    ],
  },
  "platform-performance": {
    id: "proof:platform-gameplay-impact",
    goal:
      "Prove or disprove a selected-version platform/performance constraint that materially reduces gameplay behavior.",
    route: [
      {
        knowledgeDomain: "platform-constraints",
        question:
          "What exact selected-version platform constraint applies?",
        purpose:
          "Ground platform behavior from applicable knowledge.",
        evidencePreference: "selected-artifact",
      },
      {
        knowledgeDomain: "state-flow",
        question:
          "Which required gameplay dependency is changed by the constraint?",
        purpose:
          "Translate platform limitation into player-visible consequence.",
        evidencePreference: "cross-domain",
      },
      {
        knowledgeDomain: "runtime",
        question:
          "Does the target runtime exhibit the unresolved platform behavior?",
        purpose:
          "Observe only when documentation/source constraints are insufficient.",
        evidencePreference: "runtime",
      },
    ],
  },
};

export function buildAuditProofNavigation(
  finding: NeedValidationAuditIssueProjection,
): AuditProofNavigation {
  const recipe = RECIPES[finding.failureDomain];
  const provenClaims = [
    ...(finding.evidenceIds.length > 0
      ? [
          "Selected-artifact/analysis evidence already grounds this finding scope: " +
            finding.evidenceIds.join(", ") +
            ".",
        ]
      : []),
    ...(finding.expectedOutcome.trim()
      ? [
          "Required gameplay dependency is identified: " +
            finding.expectedOutcome,
        ]
      : []),
    ...(finding.actualOutcome.trim()
      ? [
          "Current unresolved/contradictory observation is scoped: " +
            finding.actualOutcome,
        ]
      : []),
  ];

  return {
    recipeId: recipe.id,
    proofGoal: recipe.goal,
    provenClaims,
    missingClaims: [
      finding.missingProof,
    ],
    route: recipe.route.map((step, index) => ({
      order: index + 1,
      ...step,
    })),
    runtimeLastResort: true,
  };
}
