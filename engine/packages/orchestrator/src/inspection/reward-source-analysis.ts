import {
  extractEntityLootSemantics,
  type ParsedEntityDefinition,
} from "../../../../analyzers/entities/src/index.js";
import type {
  ParsedFunction,
} from "../../../../analyzers/functions/src/index.js";
import type {
  ParsedScriptFile,
  ScriptEconomyEvidence,
} from "../../../../analyzers/scripts/src/index.js";

export type RewardSourceKind =
  | "ENGINE_LOOT_TABLE"
  | "LOOT_COMMAND"
  | "SCRIPT_INVENTORY_GRANT"
  | "WORLD_ITEM_DROP"
  | "DROPPED_ITEM_PICKUP"
  | "SCOREBOARD_CURRENCY";

export interface ScriptRewardPathAssessment {
  scriptId: string;
  trigger: "death" | "pickup";
  callbackRegion: string;
  reachableRegions: readonly string[];
  inventoryGrants: number;
  worldDrops: number;
  lootCommands: number;
  scoreCredits: number;
  scoreDebits: number;
  scoreAdjustments: number;
  scoreWrites: number;
  itemConsumes: number;
  dropCleanupSurfaces: number;
  deathEntityTypeGuards: readonly string[];
  idempotencyGuards: number;
  cleanupReleases: number;
  rewardCleanupOrdering:
    | "proven-after-journal"
    | "contradicted-before-journal"
    | "unresolved"
    | "not-applicable";
}

export interface RewardSourceAnalysis {
  sourceKinds: readonly RewardSourceKind[];
  engineLootEntities: number;
  engineLootTables: number;
  unresolvedEngineLootTables: number;
  scriptInventoryGrants: number;
  worldDrops: number;
  pickupObservers: number;
  scriptLootCommands: number;
  functionLootCommands: number;
  scoreboardCredits: number;
  scoreboardDebits: number;
  scoreboardAdjustments: number;
  scoreboardWrites: number;
  itemConsumes: number;
  dropCleanupSurfaces: number;
  worldDropRewardPathsWithoutCleanup: number;
  rewardPathsWithoutIdempotency: number;
  cleanupAfterRewardJournalProven: number;
  cleanupBeforeRewardJournalRisks: number;
  cleanupRewardJournalOrderingUnresolved: number;
  deathRewardPaths: number;
  pickupCurrencyPaths: number;
  deathRewardSourceOverlapCandidates: number;
  deathRewardSourceOverlapUnresolved: number;
  pickupCurrencyWithoutConsumeCandidates: number;
  paths: readonly ScriptRewardPathAssessment[];
}

function graphFor(
  script: ParsedScriptFile,
): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  for (const call of script.localFunctionCalls) {
    const next =
      graph.get(call.callerRegion) ??
      new Set<string>();
    next.add(call.targetRegion);
    graph.set(call.callerRegion, next);
  }
  return graph;
}

function reachable(
  graph: ReadonlyMap<string, ReadonlySet<string>>,
  root: string,
): string[] {
  const seen = new Set<string>([root]);
  const queue = [root];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of graph.get(current) ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }

  return [...seen].sort();
}

function normalizedCommand(
  command: string,
): string {
  return command
    .trim()
    .replace(/^\//, "")
    .toLowerCase();
}

function isLootCommand(
  command: string,
): boolean {
  return normalizedCommand(command)
    .startsWith("loot ");
}

function scoreboardCommandKind(
  command: string,
):
  | "credit"
  | "debit"
  | "write"
  | undefined {
  const normalized =
    normalizedCommand(command);

  if (
    normalized.startsWith(
      "scoreboard players add ",
    )
  ) {
    return "credit";
  }
  if (
    normalized.startsWith(
      "scoreboard players remove ",
    )
  ) {
    return "debit";
  }
  if (
    normalized.startsWith(
      "scoreboard players set ",
    )
  ) {
    return "write";
  }
  return undefined;
}

function countKind(
  evidence: readonly ScriptEconomyEvidence[],
  kind: ScriptEconomyEvidence["kind"],
): number {
  return evidence.filter(
    (item) => item.kind === kind,
  ).length;
}

function commandsInRegions(
  script: ParsedScriptFile,
  regions: ReadonlySet<string>,
): readonly string[] {
  return script.commandLiterals
    .filter(
      (item) =>
        item.executionRegion !== undefined &&
        regions.has(item.executionRegion),
    )
    .map((item) => item.command);
}

function pathAssessment(
  script: ParsedScriptFile,
  trigger: "death" | "pickup",
  root: string,
): ScriptRewardPathAssessment {
  const graph = graphFor(script);
  const reachableRegions =
    reachable(graph, root);
  const regionSet =
    new Set(reachableRegions);
  const economy = (
    script.economyEvidence ?? []
  ).filter(
    (item) =>
      regionSet.has(
        item.executionRegion,
      ),
  );
  const commands =
    commandsInRegions(
      script,
      regionSet,
    );
  const idempotencyGuardEvidence =
    (
      script.persistenceIdempotencyGuards ??
      []
    ).filter(
      (guard) =>
        regionSet.has(
          guard.executionRegion,
        ),
    );
  const idempotencyGuards =
    idempotencyGuardEvidence.length;
  const cleanupReleases =
    (
      script.cleanupResourceEvidence ??
      []
    ).filter(
      (item) =>
        item.action === "release" &&
        regionSet.has(
          item.executionRegion,
        ),
    );

  const cleanupOrdering = (() => {
    if (cleanupReleases.length === 0) {
      return "not-applicable" as const;
    }
    if (idempotencyGuardEvidence.length === 0) {
      return "unresolved" as const;
    }

    let unresolved = false;
    for (const cleanup of cleanupReleases) {
      const sameRegion =
        idempotencyGuardEvidence.filter(
          (guard) =>
            guard.executionRegion ===
              cleanup.executionRegion,
        );
      if (sameRegion.length === 0) {
        unresolved = true;
        continue;
      }

      const cleanupLine =
        cleanup.source.range?.lineStart;
      if (cleanupLine === undefined) {
        unresolved = true;
        continue;
      }

      for (const guard of sameRegion) {
        const journalLine =
          guard.journalWriteSource.range
            ?.lineStart;
        if (journalLine === undefined) {
          unresolved = true;
          continue;
        }
        if (cleanupLine < journalLine) {
          return "contradicted-before-journal" as const;
        }
      }
    }

    return unresolved
      ? "unresolved" as const
      : "proven-after-journal" as const;
  })();

  return {
    scriptId: script.identifier,
    trigger,
    callbackRegion: root,
    reachableRegions,
    inventoryGrants:
      countKind(
        economy,
        "inventory-grant",
      ),
    worldDrops:
      countKind(
        economy,
        "world-drop",
      ),
    lootCommands:
      commands.filter(isLootCommand)
        .length,
    scoreCredits:
      countKind(
        economy,
        "score-credit",
      ) +
      commands.filter(
        (command) =>
          scoreboardCommandKind(command) ===
          "credit",
      ).length,
    scoreDebits:
      countKind(
        economy,
        "score-debit",
      ) +
      commands.filter(
        (command) =>
          scoreboardCommandKind(command) ===
          "debit",
      ).length,
    scoreAdjustments:
      countKind(
        economy,
        "score-adjust",
      ),
    scoreWrites:
      countKind(
        economy,
        "score-write",
      ) +
      commands.filter(
        (command) =>
          scoreboardCommandKind(command) ===
          "write",
      ).length,
    itemConsumes:
      countKind(
        economy,
        "item-consume",
      ),
    dropCleanupSurfaces:
      countKind(
        economy,
        "item-consume",
      ) +
      commands.filter(
        isItemCleanupCommand,
      ).length,
    deathEntityTypeGuards: [
      ...new Set(
        economy.flatMap((item) =>
          item.kind ===
            "death-entity-type-guard" &&
          item.entityIdentifier !== undefined
            ? [item.entityIdentifier]
            : [],
        ),
      ),
    ].sort(),
    idempotencyGuards,
    cleanupReleases:
      cleanupReleases.length,
    rewardCleanupOrdering:
      cleanupOrdering,
  };
}

function scriptRewardPaths(
  script: ParsedScriptFile,
): ScriptRewardPathAssessment[] {
  const roots: {
    trigger: "death" | "pickup";
    region: string;
  }[] = [];

  for (
    const evidence of
      script.combatLifecycleEvidence ?? []
  ) {
    if (
      evidence.kind ===
      "death-subscription"
    ) {
      roots.push({
        trigger: "death",
        region:
          evidence.executionRegion,
      });
    }
  }

  for (
    const evidence of
      script.economyEvidence ?? []
  ) {
    if (
      evidence.kind ===
      "pickup-subscription"
    ) {
      roots.push({
        trigger: "pickup",
        region:
          evidence.executionRegion,
      });
    }
  }

  return roots.map((root) =>
    pathAssessment(
      script,
      root.trigger,
      root.region,
    )
  );
}

function isItemCleanupCommand(
  command: string,
): boolean {
  const normalized =
    normalizedCommand(command);
  return (
    normalized.startsWith("kill ") &&
    /type\s*=\s*(?:minecraft:)?item\b/i.test(
      normalized,
    )
  );
}

function hasRewardDelivery(
  path: ScriptRewardPathAssessment,
): boolean {
  return (
    path.inventoryGrants > 0 ||
    path.worldDrops > 0 ||
    path.lootCommands > 0 ||
    path.scoreCredits > 0 ||
    path.scoreWrites > 0
  );
}

export function analyzeRewardSources(
  scripts: readonly ParsedScriptFile[],
  functions: readonly ParsedFunction[],
  entities: readonly ParsedEntityDefinition[],
): RewardSourceAnalysis {
  const entityLoot =
    entities.map(
      extractEntityLootSemantics,
    );
  const engineLootEntities =
    entityLoot.filter(
      (item) =>
        item.configuredStates > 0,
    ).length;
  const engineLootEntityKeys =
    new Set(
      entityLoot
        .filter(
          (item) =>
            item.configuredStates > 0,
        )
        .map((item) => item.entityKey),
    );
  const engineLootTables =
    new Set(
      entityLoot.flatMap(
        (item) => item.lootTables,
      ),
    ).size;
  const unresolvedEngineLootTables =
    entityLoot.reduce(
      (sum, item) =>
        sum +
        item.states.filter(
          (state) =>
            state.configured &&
            state.lootTable === undefined,
        ).length,
      0,
    );

  const economy =
    scripts.flatMap(
      (script) =>
        script.economyEvidence ?? [],
    );
  const scriptCommands =
    scripts.flatMap(
      (script) =>
        script.commandLiterals.map(
          (item) => item.command,
        ),
    );
  const functionCommands =
    functions.flatMap(
      (fn) =>
        fn.commands.map(
          (item) => item.raw,
        ),
    );

  const paths = scripts
    .flatMap(scriptRewardPaths)
    .sort((a, b) =>
      a.trigger.localeCompare(b.trigger) ||
      a.scriptId.localeCompare(b.scriptId) ||
      a.callbackRegion.localeCompare(
        b.callbackRegion,
      )
    );
  const deathRewardPaths =
    paths.filter(
      (item) =>
        item.trigger === "death" &&
        hasRewardDelivery(item),
    );
  const pickupCurrencyPaths =
    paths.filter(
      (item) =>
        item.trigger === "pickup" &&
        (
          item.scoreCredits > 0 ||
          item.scoreWrites > 0
        ),
    );

  const scriptLootCommands =
    scriptCommands.filter(isLootCommand)
      .length;
  const functionLootCommands =
    functionCommands.filter(isLootCommand)
      .length;

  const scoreboardCredits =
    countKind(economy, "score-credit") +
    [
      ...scriptCommands,
      ...functionCommands,
    ].filter(
      (command) =>
        scoreboardCommandKind(command) ===
        "credit",
    ).length;
  const scoreboardDebits =
    countKind(economy, "score-debit") +
    [
      ...scriptCommands,
      ...functionCommands,
    ].filter(
      (command) =>
        scoreboardCommandKind(command) ===
        "debit",
    ).length;
  const scoreboardAdjustments =
    countKind(
      economy,
      "score-adjust",
    );
  const scoreboardWrites =
    countKind(economy, "score-write") +
    [
      ...scriptCommands,
      ...functionCommands,
    ].filter(
      (command) =>
        scoreboardCommandKind(command) ===
        "write",
    ).length;

  const sourceKinds =
    new Set<RewardSourceKind>();
  if (engineLootEntities > 0) {
    sourceKinds.add("ENGINE_LOOT_TABLE");
  }
  if (
    scriptLootCommands +
      functionLootCommands >
    0
  ) {
    sourceKinds.add("LOOT_COMMAND");
  }
  if (
    countKind(
      economy,
      "inventory-grant",
    ) > 0
  ) {
    sourceKinds.add(
      "SCRIPT_INVENTORY_GRANT",
    );
  }
  if (
    countKind(
      economy,
      "world-drop",
    ) > 0
  ) {
    sourceKinds.add("WORLD_ITEM_DROP");
  }
  if (
    countKind(
      economy,
      "pickup-subscription",
    ) > 0
  ) {
    sourceKinds.add(
      "DROPPED_ITEM_PICKUP",
    );
  }
  if (
    scoreboardCredits +
      scoreboardDebits +
      scoreboardWrites >
    0
  ) {
    sourceKinds.add(
      "SCOREBOARD_CURRENCY",
    );
  }

  const itemConsumes =
    countKind(
      economy,
      "item-consume",
    );
  const dropCleanupSurfaces =
    itemConsumes +
    [
      ...scriptCommands,
      ...functionCommands,
    ].filter(isItemCleanupCommand)
      .length;
  const rewardRelevantPaths = [
    ...deathRewardPaths,
    ...pickupCurrencyPaths,
  ];
  const worldDropRewardPathsWithoutCleanup =
    deathRewardPaths.filter(
      (path) =>
        path.worldDrops > 0 &&
        path.dropCleanupSurfaces === 0,
    ).length;
  const rewardPathsWithoutIdempotency =
    rewardRelevantPaths.filter(
      (path) =>
        path.idempotencyGuards === 0,
    ).length;
  const cleanupAfterRewardJournalProven =
    rewardRelevantPaths.filter(
      (path) =>
        path.rewardCleanupOrdering ===
          "proven-after-journal",
    ).length;
  const cleanupBeforeRewardJournalRisks =
    rewardRelevantPaths.filter(
      (path) =>
        path.rewardCleanupOrdering ===
          "contradicted-before-journal",
    ).length;
  const cleanupRewardJournalOrderingUnresolved =
    rewardRelevantPaths.filter(
      (path) =>
        path.rewardCleanupOrdering ===
          "unresolved",
    ).length;

  return {
    sourceKinds:
      [...sourceKinds].sort(),
    engineLootEntities,
    engineLootTables,
    unresolvedEngineLootTables,
    scriptInventoryGrants:
      countKind(
        economy,
        "inventory-grant",
      ),
    worldDrops:
      countKind(
        economy,
        "world-drop",
      ),
    pickupObservers:
      countKind(
        economy,
        "pickup-subscription",
      ),
    scriptLootCommands,
    functionLootCommands,
    scoreboardCredits,
    scoreboardDebits,
    scoreboardAdjustments,
    scoreboardWrites,
    itemConsumes,
    dropCleanupSurfaces,
    worldDropRewardPathsWithoutCleanup,
    rewardPathsWithoutIdempotency,
    cleanupAfterRewardJournalProven,
    cleanupBeforeRewardJournalRisks,
    cleanupRewardJournalOrderingUnresolved,
    deathRewardPaths:
      deathRewardPaths.length,
    pickupCurrencyPaths:
      pickupCurrencyPaths.length,
    deathRewardSourceOverlapCandidates:
      deathRewardPaths.filter((path) =>
        path.deathEntityTypeGuards.some(
          (entityKey) =>
            engineLootEntityKeys.has(
              entityKey,
            ),
        ),
      ).length,
    deathRewardSourceOverlapUnresolved:
      engineLootEntities > 0
        ? deathRewardPaths.filter(
            (path) =>
              path.deathEntityTypeGuards
                .length === 0,
          ).length
        : 0,
    pickupCurrencyWithoutConsumeCandidates:
      pickupCurrencyPaths.filter(
        (path) =>
          path.itemConsumes === 0,
      ).length,
    paths,
  };
}
