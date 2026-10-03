export const GAMEPLAY_ISSUE_FAILURE_DOMAINS = [
  "arena-multi-arena",
  "inventory-economy",
  "progression-wave-objective",
  "chunk-simulation",
  "player-lifecycle",
  "entity-ai-combat",
  "world-structure-mutation",
  "ui-feedback-information",
  "state-ownership",
  "temporal-async",
  "boundary-capacity",
  "persistence-recovery",
  "platform-performance",
] as const;

export type GameplayIssueFailureDomain =
  (typeof GAMEPLAY_ISSUE_FAILURE_DOMAINS)[number];

export type GameplayIssueFlowStage =
  | "ENTRY_JOIN"
  | "READY_START"
  | "SETUP"
  | "ACTIVE_GAMEPLAY"
  | "PROGRESSION"
  | "TERMINAL"
  | "CLEANUP_REPLAY"
  | "RECOVERY"
  | "FULL_JOURNEY";

export interface GameplayIssueClassification {
  readonly failureDomain: GameplayIssueFailureDomain;
  readonly gameplayFlow: GameplayIssueFlowStage;
}

const DOMAIN_BY_KNOWLEDGE:
  Readonly<Record<string, GameplayIssueFailureDomain>> = {
    "arena-lifecycle": "arena-multi-arena",
    "multiplayer-interleaving": "arena-multi-arena",
    "inventory-state": "inventory-economy",
    "economy-reward": "inventory-economy",
    "chunk-simulation": "chunk-simulation",
    "entity-behavior": "entity-ai-combat",
    "combat-lifecycle": "entity-ai-combat",
    "world-structure": "world-structure-mutation",
    "spatial-authority": "world-structure-mutation",
    "temporal-ownership": "temporal-async",
    "persistence-recovery": "persistence-recovery",
    "platform-constraints": "platform-performance",
    "state-flow": "state-ownership",
  };

const COMPONENT_DOMAIN_HINTS:
  readonly [
    readonly string[],
    GameplayIssueFailureDomain,
  ][] = [
    [[
      "runtime:arena",
      "runtime:arena-capacity",
      "runtime:arena-lifecycle",
      "runtime:arena-isolation",
      "runtime:arena-cleanup",
      "runtime:arena-replica-integrity",
    ], "arena-multi-arena"],
    [["runtime:inventory", "runtime:economy"], "inventory-economy"],
    [["runtime:chunks"], "chunk-simulation"],
    [["runtime:entities", "runtime:combat"], "entity-ai-combat"],
    [["runtime:structures", "runtime:spatial"], "world-structure-mutation"],
    [["runtime:persistence"], "persistence-recovery"],
    [["runtime:state"], "state-ownership"],
    [["runtime:boundaries"], "boundary-capacity"],
    [["runtime:teleport"], "player-lifecycle"],
    [["runtime:ui-form"], "ui-feedback-information"],
    [["runtime:environment"], "platform-performance"],
    [["runtime:async-command-transaction", "runtime:dynamic-command"], "temporal-async"],
  ];

function flowStage(
  value: string,
): GameplayIssueFlowStage {
  switch (value) {
    case "ENTRY_JOIN":
    case "READY_START":
    case "SETUP":
    case "ACTIVE_GAMEPLAY":
    case "PROGRESSION":
    case "TERMINAL":
    case "CLEANUP_REPLAY":
    case "RECOVERY":
    case "FULL_JOURNEY":
      return value;
    default:
      if (/recovery|reload|reconnect/i.test(value)) {
        return "RECOVERY";
      }
      if (/terminal|result|victory|defeat/i.test(value)) {
        return "TERMINAL";
      }
      if (/cleanup|replay|repeat/i.test(value)) {
        return "CLEANUP_REPLAY";
      }
      if (/progress|wave|objective|level/i.test(value)) {
        return "PROGRESSION";
      }
      if (/ready|start|capacity|admission/i.test(value)) {
        return "READY_START";
      }
      if (/setup|prepare|loadout/i.test(value)) {
        return "SETUP";
      }
      if (/join|entry|lobby/i.test(value)) {
        return "ENTRY_JOIN";
      }
      return "ACTIVE_GAMEPLAY";
  }
}

export function classifyGameplayIssue(input: {
  readonly gameplayStage: string;
  readonly scenarioLabel: string;
  readonly componentIds: readonly string[];
  readonly knowledgeDomain?: string;
}): GameplayIssueClassification {
  const gameplayFlow = flowStage(
    input.gameplayStage,
  );

  if (
    /wave|objective|progression|level/i.test(
      input.scenarioLabel,
    )
  ) {
    return {
      failureDomain: "progression-wave-objective",
      gameplayFlow,
    };
  }

  if (
    /capacity|max-party|capacity-plus-one/i.test(
      input.scenarioLabel,
    )
  ) {
    return {
      failureDomain:
        input.componentIds.some(
          (id) =>
            id.includes("arena") ||
            id === "runtime:arena-capacity",
        )
          ? "arena-multi-arena"
          : "boundary-capacity",
      gameplayFlow,
    };
  }

  if (
    input.knowledgeDomain !== undefined &&
    DOMAIN_BY_KNOWLEDGE[input.knowledgeDomain]
  ) {
    return {
      failureDomain:
        DOMAIN_BY_KNOWLEDGE[input.knowledgeDomain]!,
      gameplayFlow,
    };
  }

  for (const [ids, domain] of COMPONENT_DOMAIN_HINTS) {
    if (
      input.componentIds.some(
        (id) => ids.includes(id),
      )
    ) {
      return {
        failureDomain: domain,
        gameplayFlow,
      };
    }
  }

  if (
    /disconnect|reconnect|respawn|death|join|leave/i.test(
      input.scenarioLabel,
    )
  ) {
    return {
      failureDomain: "player-lifecycle",
      gameplayFlow,
    };
  }

  return {
    failureDomain: "state-ownership",
    gameplayFlow,
  };
}
