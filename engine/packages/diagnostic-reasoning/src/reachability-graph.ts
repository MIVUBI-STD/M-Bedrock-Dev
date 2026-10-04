export type GameplayReachabilityNodeKind =
  | "player"
  | "item"
  | "resource"
  | "location"
  | "interaction"
  | "permission"
  | "capability"
  | "state"
  | "recipe"
  | "loot"
  | "container"
  | "entity"
  | "custom";

export interface GameplayReachabilityNode {
  readonly id: string;
  readonly kind: GameplayReachabilityNodeKind;
  readonly label: string;
  readonly playerAccessible?: boolean;
  readonly evidenceIds?: readonly string[];
}

export interface GameplayReachabilityEdge {
  readonly from: string;
  readonly to: string;
  readonly kind:
    | "contains"
    | "grants"
    | "crafts"
    | "drops"
    | "unlocks"
    | "requires"
    | "triggers"
    | "enters"
    | "interacts-with"
    | "authorizes"
    | "produces"
    | "custom";
  readonly evidenceIds?: readonly string[];
}

export interface GameplayReachabilityGraph {
  readonly nodes: readonly GameplayReachabilityNode[];
  readonly edges: readonly GameplayReachabilityEdge[];
  readonly coverage?: {
    readonly complete: boolean;
    readonly sources: readonly string[];
    readonly gaps: readonly string[];
  };
}

export interface GameplayReachabilityPath {
  readonly reachable: boolean;
  readonly resolution:
    | "reachable"
    | "unreachable"
    | "unknown";
  readonly targetId: string;
  readonly originId?: string;
  readonly nodeIds: readonly string[];
  readonly edgeKinds: readonly GameplayReachabilityEdge["kind"][];
  readonly evidenceIds: readonly string[];
}

export function findGameplayReachability(
  graph: GameplayReachabilityGraph,
  targetId: string,
  originIds?: readonly string[],
): GameplayReachabilityPath {
  const nodes = new Map(
    graph.nodes.map((node) => [node.id, node]),
  );
  if (!nodes.has(targetId)) {
    return {
      reachable: false,
      resolution:
        graph.coverage?.complete === true
          ? "unreachable"
          : "unknown",
      targetId,
      nodeIds: [],
      edgeKinds: [],
      evidenceIds: [],
    };
  }

  const origins = new Set(
    originIds ??
      graph.nodes
        .filter((node) => node.playerAccessible === true)
        .map((node) => node.id),
  );

  const outgoing = new Map<string, GameplayReachabilityEdge[]>();
  for (const edge of graph.edges) {
    const list = outgoing.get(edge.from) ?? [];
    list.push(edge);
    outgoing.set(edge.from, list);
  }

  const queue = [...origins].map((id) => ({
    id,
    nodes: [id],
    edges: [] as GameplayReachabilityEdge[],
  }));
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current.id)) continue;
    visited.add(current.id);

    if (current.id === targetId) {
      const evidenceIds = [
        ...new Set([
          ...current.nodes.flatMap(
            (id) => nodes.get(id)?.evidenceIds ?? [],
          ),
          ...current.edges.flatMap(
            (edge) => edge.evidenceIds ?? [],
          ),
        ]),
      ].sort();

      return {
        reachable: true,
        resolution: "reachable",
        targetId,
        originId: current.nodes[0],
        nodeIds: current.nodes,
        edgeKinds: current.edges.map((edge) => edge.kind),
        evidenceIds,
      };
    }

    for (const edge of outgoing.get(current.id) ?? []) {
      if (visited.has(edge.to)) continue;
      queue.push({
        id: edge.to,
        nodes: [...current.nodes, edge.to],
        edges: [...current.edges, edge],
      });
    }
  }

  return {
    reachable: false,
    resolution:
      graph.coverage?.complete === true
        ? "unreachable"
        : "unknown",
    targetId,
    nodeIds: [],
    edgeKinds: [],
    evidenceIds: [
      ...new Set(
        nodes.get(targetId)?.evidenceIds ?? [],
      ),
    ].sort(),
  };
}
