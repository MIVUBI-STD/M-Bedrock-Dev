import type {
  ParsedScriptFile,
} from "../../../../analyzers/scripts/src/index.js";
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

export function buildGameplayReachabilityGraph(
  scripts: readonly {
    readonly parsed: ParsedScriptFile;
    readonly text?: string;
  }[],
): GameplayReachabilityGraph {
  const nodes = new Map<
    string,
    GameplayReachabilityNode
  >();
  const edges: GameplayReachabilityEdge[] = [];

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
  };
}
