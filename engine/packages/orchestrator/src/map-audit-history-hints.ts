import type {
  GameplayIssueFailureDomain,
} from "../../diagnostic-reasoning/src/index.js";
import type {
  GameplayWorldModel,
} from "./inspection/gameplay-world-model.js";
import type {
  NeedValidationAuditIssueProjection,
} from "./map-audit-issue-projection.js";

export interface AuditHistoricalSearchHint {
  readonly id: string;
  readonly family: string;
  readonly priority: "high" | "medium";
  readonly knowledgeDomains: readonly string[];
  readonly searchQuestions: readonly string[];
  readonly matchedBecause: readonly string[];
  readonly source:
    | "generic-regression-learning"
    | "reliability-blindspot-family";
}

interface HistoricalFailureFamily {
  readonly id: string;
  readonly family: string;
  readonly domains: readonly GameplayIssueFailureDomain[];
  readonly knowledgeDomains: readonly string[];
  readonly questions: readonly string[];
  readonly priority: "high" | "medium";
  readonly applies: (
    finding: NeedValidationAuditIssueProjection,
    world: GameplayWorldModel,
  ) => readonly string[];
}

const FAMILIES: readonly HistoricalFailureFamily[] = [
  {
    id: "history:simulation-resource-realization",
    family: "declared simulation resource without lifecycle realization",
    domains: [
      "chunk-simulation",
      "progression-wave-objective",
      "arena-multi-arena",
    ],
    knowledgeDomains: [
      "chunk-simulation",
      "platform-constraints",
      "entity-behavior",
      "state-flow",
    ],
    questions: [
      "Does required remote gameplay have a concrete residency/ticking acquire path?",
      "Is readiness proven before progression depends on the region/actor?",
      "Is release paired with acquisition and bounded by capacity?",
      "Can progression wait forever on an actor/region that is no longer simulated?",
    ],
    priority: "high",
    applies: (_finding, world) => {
      const reasons: string[] = [];
      if (world.entities.definitions > 0) {
        reasons.push(
          "gameplay contains entity runtime dependencies",
        );
      }
      if (
        world.chunks.tickingAreaAcquires === 0 &&
        world.entities.definitions > 0
      ) {
        reasons.push(
          "entities exist but no ticking-area acquisition was detected",
        );
      }
      if (
        world.chunks.capacityUncheckedLeases > 0 ||
        world.chunks.readinessUnverifiedLeases > 0
      ) {
        reasons.push(
          "simulation leases contain capacity/readiness gaps",
        );
      }
      return reasons;
    },
  },
  {
    id: "history:cross-arena-global-scope",
    family: "arena-local lifecycle with global selector or mutation",
    domains: [
      "arena-multi-arena",
      "state-ownership",
      "world-structure-mutation",
      "inventory-economy",
    ],
    knowledgeDomains: [
      "arena-lifecycle",
      "multiplayer-interleaving",
      "state-flow",
      "spatial-authority",
    ],
    questions: [
      "Does an arena-local trigger mutate/query global state without arena ownership filtering?",
      "Can Arena A cleanup, selector, item cleanup, audio, message, or world mutation reach Arena B?",
      "Is ownership still available at the point recipients/targets are resolved?",
      "Does cleanup fall back to world/global scope after owner state is cleared?",
    ],
    priority: "high",
    applies: (_finding, world) => {
      const reasons: string[] = [];
      if (
        world.arenas.detected &&
        (
          world.arenas.isolation.sharedGlobal > 0 ||
          world.arenas.globalState.unleasedArenaMutations > 0 ||
          world.arenas.globalState.unauditedArenaMutations > 0
        )
      ) {
        reasons.push(
          "multi-arena artifact contains shared-global or unleased arena mutations",
        );
      }
      if (
        world.arenas.detected &&
        world.spatial.authority.conflicts > 0
      ) {
        reasons.push(
          "multi-arena artifact contains spatial authority conflicts",
        );
      }
      return reasons;
    },
  },
  {
    id: "history:stale-deferred-owner",
    family: "deferred work commits after ownership revision",
    domains: [
      "temporal-async",
      "player-lifecycle",
      "arena-multi-arena",
      "persistence-recovery",
      "inventory-economy",
    ],
    knowledgeDomains: [
      "temporal-ownership",
      "state-flow",
      "arena-lifecycle",
      "persistence-recovery",
    ],
    questions: [
      "Can scheduled work survive cleanup, retry, reconnect, terminal, or arena reuse?",
      "Does the callback revalidate session/arena/player generation immediately before commit?",
      "Can an old callback mutate inventory, position, score, message, or world state owned by a new run?",
      "Is cancellation sufficient, or is commit-time generation validation also required?",
    ],
    priority: "high",
    applies: (_finding, world) => {
      const reasons: string[] = [];
      if (
        world.chunks.unguardedDeferredChunkWork > 0
      ) {
        reasons.push(
          "unguarded deferred chunk work is present",
        );
      }
      if (
        world.combat.runtime.scopedLifeGenerationMissing > 0 ||
        world.combat.runtime.scopedArenaGenerationMissing > 0
      ) {
        reasons.push(
          "runtime lifecycle evidence contains missing generation scoping",
        );
      }
      return reasons;
    },
  },
  {
    id: "history:recovery-authority-collision",
    family: "multiple systems restore the same player/session state",
    domains: [
      "persistence-recovery",
      "inventory-economy",
      "player-lifecycle",
      "arena-multi-arena",
    ],
    knowledgeDomains: [
      "persistence-recovery",
      "inventory-state",
      "arena-lifecycle",
      "state-flow",
    ],
    questions: [
      "How many owners can restore position/loadout/state on join, spawn, reconnect, or death?",
      "Do restore owners operate on the same player/item/session scope?",
      "What guard makes the owners mutually exclusive?",
      "Can restore ordering cause duplicate grant, wrong teleport, or stale state overwrite?",
    ],
    priority: "high",
    applies: (_finding, world) => {
      const reasons: string[] = [];
      if (
        world.inventory.restoreOwnership.multipleRestoreOwners > 0
      ) {
        reasons.push(
          "multiple inventory restore owners are detected",
        );
      }
      if (world.inventory.restoreConflicts.length > 0) {
        reasons.push(
          "inventory restore conflicts are present",
        );
      }
      return reasons;
    },
  },
  {
    id: "history:recovery-snapshot-completeness",
    family: "transient gameplay state missing from recovery snapshot",
    domains: [
      "persistence-recovery",
      "player-lifecycle",
      "state-ownership",
      "progression-wave-objective",
    ],
    knowledgeDomains: [
      "persistence-recovery",
      "state-flow",
      "temporal-ownership",
    ],
    questions: [
      "Which transient states can be active at disconnect/reload?",
      "Which of those states are snapshotted, reconstructed, reset, or intentionally abandoned?",
      "Are pending timers/respawns/deferred operations represented by equivalent recovery state?",
      "Can recovered logical state disagree with remaining temporal work?",
    ],
    priority: "high",
    applies: (_finding, world) => {
      const reasons: string[] = [];
      if (
        (world.persistence?.unknownLifetime ?? 0) > 0 ||
        (world.persistence?.unknownScope ?? 0) > 0
      ) {
        reasons.push(
          "persistent state contains unresolved scope/lifetime",
        );
      }
      if (
        (world.persistence?.appendWithoutClear ?? 0) > 0
      ) {
        reasons.push(
          "persistent append-without-clear paths exist",
        );
      }
      return reasons;
    },
  },
  {
    id: "history:progression-accounting-hole",
    family: "required work escapes completion accounting",
    domains: [
      "progression-wave-objective",
      "entity-ai-combat",
      "temporal-async",
    ],
    knowledgeDomains: [
      "state-flow",
      "entity-behavior",
      "temporal-ownership",
      "combat-lifecycle",
    ],
    questions: [
      "What exact counter/state proves completion?",
      "Does every spawn/retry/remove/death/despawn path update completion accounting?",
      "Can required deferred work exist outside the completion gate?",
      "Can a tracker reach a permanently non-zero/non-terminal state after the actor/work disappears?",
    ],
    priority: "high",
    applies: (_finding, world) => {
      const reasons: string[] = [];
      if (
        world.entities.definitions > 0 &&
        (
          world.combat.deathHandlers > 0 ||
          world.chunks.entityRemoveObservers > 0
        )
      ) {
        reasons.push(
          "entity termination/removal paths coexist with progression-relevant actor systems",
        );
      }
      return reasons;
    },
  },
  {
    id: "history:cleanup-reuse-baseline",
    family: "cleanup leaves stale state into the next run",
    domains: [
      "state-ownership",
      "arena-multi-arena",
      "inventory-economy",
      "world-structure-mutation",
      "persistence-recovery",
    ],
    knowledgeDomains: [
      "state-flow",
      "arena-lifecycle",
      "inventory-state",
      "world-structure",
      "persistence-recovery",
    ],
    questions: [
      "For every acquired/mutated resource, what exact cleanup/reset restores baseline?",
      "Does second-run state equal first-run baseline for state, inventory, entities, world mutation, and leases?",
      "Can offline players or stale callbacks miss terminal cleanup?",
      "Is cleanup scoped to the owning arena/player/run rather than global or online-only state?",
    ],
    priority: "high",
    applies: (_finding, world) => {
      const reasons: string[] = [];
      if (
        world.arenas.cleanup.resourceLedger.missing > 0 ||
        world.arenas.cleanup.unresolved > 0
      ) {
        reasons.push(
          "arena cleanup resource ledger is incomplete",
        );
      }
      if (
        world.structures.transitionResidueRisks > 0 ||
        world.structures.transitionResidueUnresolved > 0
      ) {
        reasons.push(
          "structure transition residue risk exists",
        );
      }
      if (
        world.inventory.partialResets > 0
      ) {
        reasons.push(
          "partial inventory reset paths exist",
        );
      }
      return reasons;
    },
  },
];

export function historicalSearchHintsForFinding(
  finding: NeedValidationAuditIssueProjection,
  world: GameplayWorldModel,
): readonly AuditHistoricalSearchHint[] {
  return FAMILIES
    .filter((family) =>
      family.domains.includes(
        finding.failureDomain,
      )
    )
    .flatMap((family) => {
      const matchedBecause =
        family.applies(
          finding,
          world,
        );
      if (matchedBecause.length === 0) {
        return [];
      }
      return [{
        id: family.id,
        family: family.family,
        priority: family.priority,
        knowledgeDomains: [
          ...family.knowledgeDomains,
        ],
        searchQuestions: [
          ...family.questions,
        ],
        matchedBecause: [
          ...matchedBecause,
        ],
        source:
          "generic-regression-learning" as const,
      }];
    })
    .sort((a, b) =>
      (a.priority === "high" ? 0 : 1) -
        (b.priority === "high" ? 0 : 1) ||
      a.id.localeCompare(b.id)
    );
}

export function historicalSearchPressure(
  hints: readonly AuditHistoricalSearchHint[],
): number {
  return hints.reduce(
    (sum, hint) =>
      sum +
      (hint.priority === "high" ? 2 : 1),
    0,
  );
}

export function historicalSurfaceSearchPressure(
  surfaceId: string,
  world: GameplayWorldModel,
): number {
  let pressure = 0;

  if (
    surfaceId === "runtime:chunks" &&
    world.entities.definitions > 0 &&
    (
      world.chunks.tickingAreaAcquires === 0 ||
      world.chunks.capacityUncheckedLeases > 0 ||
      world.chunks.readinessUnverifiedLeases > 0
    )
  ) {
    pressure += 3;
  }

  if (
    (
      surfaceId === "runtime:arena-isolation" ||
      surfaceId === "runtime:arena-cleanup" ||
      surfaceId === "runtime:arena"
    ) &&
    world.arenas.detected &&
    (
      world.arenas.isolation.sharedGlobal > 0 ||
      world.arenas.globalState.unleasedArenaMutations > 0 ||
      world.arenas.cleanup.resourceLedger.missing > 0
    )
  ) {
    pressure += 3;
  }

  if (
    surfaceId === "runtime:inventory" &&
    (
      world.inventory.restoreOwnership.multipleRestoreOwners > 0 ||
      world.inventory.restoreConflicts.length > 0 ||
      world.inventory.partialResets > 0
    )
  ) {
    pressure += 3;
  }

  if (
    surfaceId === "runtime:persistence" &&
    (
      (world.persistence?.appendWithoutClear ?? 0) > 0 ||
      (world.persistence?.unknownLifetime ?? 0) > 0 ||
      (world.persistence?.unknownScope ?? 0) > 0
    )
  ) {
    pressure += 2;
  }

  if (
    surfaceId === "runtime:structures" &&
    (
      world.structures.transitionResidueRisks > 0 ||
      world.structures.transitionResidueUnresolved > 0
    )
  ) {
    pressure += 2;
  }

  if (
    surfaceId === "runtime:entities" &&
    world.entities.definitions > 0 &&
    (
      world.chunks.entityRemoveObservers > 0 ||
      world.combat.deathHandlers > 0
    )
  ) {
    pressure += 1;
  }

  return pressure;
}
