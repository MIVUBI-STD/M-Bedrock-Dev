import type {
  ParsedScriptFile,
} from "../../../../analyzers/scripts/src/index.js";
import type {
  SemanticNode,
} from "../../../graph/src/index.js";
import type {
  GameplayReachabilityEdge,
  GameplayReachabilityGraph,
  GameplayReachabilityNode,
} from "../../../diagnostic-reasoning/src/index.js";

function itemNodeId(
  identifier: string,
): string {
  return "item:" + identifier.toLowerCase();
}

function normalizeItemIdentifier(
  value: string,
): string {
  return value.includes(":")
    ? value.toLowerCase()
    : "minecraft:" + value.toLowerCase();
}

function record(
  value: unknown,
): Record<string, unknown> | undefined {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
      ? value as Record<string, unknown>
      : undefined;
}

function itemIdentifier(
  value: unknown,
): string | undefined {
  if (typeof value === "string") {
    return normalizeItemIdentifier(value);
  }
  const object = record(value);
  const item =
    object?.item ??
    object?.name;
  return typeof item === "string"
    ? normalizeItemIdentifier(item)
    : undefined;
}

function recipeIngredients(
  definition: Record<string, unknown>,
): {
  readonly itemIds: readonly string[];
  readonly unresolved: boolean;
} {
  const ids: string[] = [];
  let unresolved = false;

  const ingredients = definition.ingredients;
  if (Array.isArray(ingredients)) {
    for (const ingredient of ingredients) {
      const id = itemIdentifier(ingredient);
      if (id) ids.push(id);
      else unresolved = true;
    }
  }

  const key = record(definition.key);
  if (key) {
    for (const ingredient of Object.values(key)) {
      const id = itemIdentifier(ingredient);
      if (id) ids.push(id);
      else unresolved = true;
    }
  }

  return {
    itemIds: [...new Set(ids)].sort(),
    unresolved,
  };
}

function recipeResult(
  definition: Record<string, unknown>,
): string | undefined {
  const result = definition.result;
  if (Array.isArray(result)) {
    const ids = [
      ...new Set(
        result
          .map(itemIdentifier)
          .filter(
            (item): item is string =>
              item !== undefined,
          ),
      ),
    ];
    return ids.length === 1
      ? ids[0]
      : undefined;
  }
  return itemIdentifier(result);
}

function recipeDefinitions(
  node: SemanticNode,
): readonly Record<string, unknown>[] {
  if (node.kind !== "recipe") return [];
  const root = record(node.data);
  if (!root) return [];

  return Object.entries(root)
    .filter(([key]) =>
      key.startsWith("minecraft:recipe_")
    )
    .flatMap(([, value]) => {
      const definition = record(value);
      return definition ? [definition] : [];
    });
}

export function buildGameplayReachabilityGraph(
  scripts: readonly {
    readonly parsed: ParsedScriptFile;
    readonly text?: string;
  }[],
  gameplayJsonNodes: readonly SemanticNode[] = [],
  structures: readonly {
    readonly identifier: string;
    readonly node: SemanticNode;
    readonly containerItems: readonly {
      readonly flatIndex: number;
      readonly itemId: string;
      readonly count?: number;
    }[];
  }[] = [],
): GameplayReachabilityGraph {
  const nodes = new Map<
    string,
    GameplayReachabilityNode
  >();
  const edges: GameplayReachabilityEdge[] = [];
  const coverageSources = new Set<string>([
    "script-item-grants",
    "script-world-drops",
    "give-command",
  ]);
  const coverageGaps = new Set<string>([
    "world-container-contents",
    "engine-loot-table-items",
    "world-natural-acquisition",
  ]);

  const playerId = "player:ordinary";
  nodes.set(playerId, {
    id: playerId,
    kind: "player",
    label: "Ordinary Player",
    playerAccessible: true,
  });

  const ensureItem = (
    identifier: string,
    evidenceIds: readonly string[],
  ): string => {
    const normalized =
      normalizeItemIdentifier(identifier);
    const id = itemNodeId(normalized);
    if (!nodes.has(id)) {
      nodes.set(id, {
        id,
        kind: "item",
        label: normalized,
        evidenceIds,
      });
    }
    return id;
  };

  const addPlayerItemEdge = (
    item: string,
    kind:
      | "grants"
      | "drops"
      | "produces",
    evidenceIds: readonly string[],
  ) => {
    edges.push({
      from: playerId,
      to: ensureItem(item, evidenceIds),
      kind,
      evidenceIds,
    });
  };

  for (const entry of scripts) {
    const parsed = entry.parsed;

    for (
      const evidence of
        parsed.inventoryLifecycleEvidence ?? []
    ) {
      if (!evidence.itemIdentifier) continue;
      const evidenceId =
        evidence.source.relativePath +
        ":" +
        String(
          evidence.source.range?.lineStart ??
          "?",
        );

      if (
        evidence.kind === "item-grant" ||
        evidence.kind === "equipment-set"
      ) {
        addPlayerItemEdge(
          evidence.itemIdentifier,
          "grants",
          [evidenceId],
        );
      } else if (
        evidence.kind === "item-drop" ||
        evidence.kind ===
          "item-world-spawn"
      ) {
        addPlayerItemEdge(
          evidence.itemIdentifier,
          "drops",
          [evidenceId],
        );
      }
    }

    for (const command of parsed.commandLiterals) {
      const normalized =
        command.command.trim().replace(/^\//, "");
      const give = normalized.match(
        /^give\s+\S+\s+([a-z0-9_:.\/-]+)/i,
      );
      if (give?.[1]) {
        addPlayerItemEdge(
          give[1],
          "grants",
          [
            command.source.relativePath +
            ":" +
            String(
              command.source.range?.lineStart ??
              "?",
            ),
          ],
        );
      }
    }
  }

  let recipeFiles = 0;
  let unresolvedRecipes = 0;
  for (const node of gameplayJsonNodes) {
    const definitions = recipeDefinitions(node);
    if (definitions.length === 0) continue;
    recipeFiles += 1;
    const evidenceIds = [
      node.source.relativePath,
    ];

    for (const definition of definitions) {
      const ingredients =
        recipeIngredients(definition);
      const result =
        recipeResult(definition);

      if (
        result === undefined ||
        ingredients.unresolved ||
        ingredients.itemIds.length !== 1
      ) {
        unresolvedRecipes += 1;
        continue;
      }

      const ingredient =
        ensureItem(
          ingredients.itemIds[0]!,
          evidenceIds,
        );
      const output =
        ensureItem(result, evidenceIds);
      edges.push({
        from: ingredient,
        to: output,
        kind: "crafts",
        evidenceIds,
      });
    }
  }

  if (recipeFiles > 0) {
    coverageSources.add(
      "behavior-pack-recipes",
    );
  }

  let structureContainerItems = 0;
  for (const structure of structures) {
    for (const item of structure.containerItems) {
      structureContainerItems += 1;
      const evidenceIds = [
        structure.node.source.relativePath +
        "#container:" +
        String(item.flatIndex),
      ];
      const containerId =
        "container:structure:" +
        structure.identifier +
        ":" +
        String(item.flatIndex);
      if (!nodes.has(containerId)) {
        nodes.set(containerId, {
          id: containerId,
          kind: "container",
          label:
            structure.identifier +
            " container " +
            String(item.flatIndex),
          evidenceIds,
        });
      }
      edges.push({
        from: containerId,
        to: ensureItem(item.itemId, evidenceIds),
        kind: "contains",
        evidenceIds,
      });
    }
  }
  if (structureContainerItems > 0) {
    coverageSources.add(
      "mcstructure-container-contents",
    );
  }
  if (unresolvedRecipes > 0) {
    coverageGaps.add(
      "multi-ingredient-or-tag-recipes",
    );
  }

  return {
    nodes: [...nodes.values()].sort(
      (a, b) => a.id.localeCompare(b.id),
    ),
    edges: edges.sort(
      (a, b) =>
        a.from.localeCompare(b.from) ||
        a.to.localeCompare(b.to) ||
        a.kind.localeCompare(b.kind),
    ),
    coverage: {
      complete: false,
      sources: [...coverageSources].sort(),
      gaps: [...coverageGaps].sort(),
    },
  };
}
