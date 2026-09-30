import type { ComponentKind } from "../../project-model/src/index.js";
import { semanticEdgeId } from "./edge-id.js";
import type {
  EdgeType,
  NodeId,
  SemanticEdge,
  SemanticNode,
} from "./types.js";

export class SemanticGraph {
  private readonly nodes = new Map<NodeId, SemanticNode>();
  private readonly edges = new Map<string, SemanticEdge>();
  private readonly outgoing = new Map<NodeId, Set<string>>();
  private readonly incoming = new Map<NodeId, Set<string>>();
  private readonly byKind = new Map<ComponentKind, Set<NodeId>>();

  addNode(node: SemanticNode): void {
    const existing = this.nodes.get(node.id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(node)) {
      throw new Error(`Conflicting semantic node identity: ${node.id}`);
    }

    this.nodes.set(node.id, node);

    let kindSet = this.byKind.get(node.kind);
    if (!kindSet) {
      kindSet = new Set();
      this.byKind.set(node.kind, kindSet);
    }
    kindSet.add(node.id);
  }

  addEdge(input: Omit<SemanticEdge, "id">): SemanticEdge {
    if (!this.nodes.has(input.from)) {
      throw new Error(`Edge source node does not exist: ${input.from}`);
    }

    if (input.status === "resolved" && (!input.to || !this.nodes.has(input.to))) {
      throw new Error("Resolved edge must point to an existing target node.");
    }

    if (input.status === "ambiguous" && (!input.candidates || input.candidates.length < 2)) {
      throw new Error("Ambiguous edge requires at least two candidate node ids.");
    }

    const edge: SemanticEdge = { ...input, id: semanticEdgeId(input) };
    this.edges.set(edge.id, edge);

    let outgoingSet = this.outgoing.get(edge.from);
    if (!outgoingSet) {
      outgoingSet = new Set();
      this.outgoing.set(edge.from, outgoingSet);
    }
    outgoingSet.add(edge.id);

    if (edge.to) {
      let incomingSet = this.incoming.get(edge.to);
      if (!incomingSet) {
        incomingSet = new Set();
        this.incoming.set(edge.to, incomingSet);
      }
      incomingSet.add(edge.id);
    }

    return edge;
  }

  getNode(id: NodeId): SemanticNode | undefined {
    return this.nodes.get(id);
  }

  allNodes(): SemanticNode[] {
    return [...this.nodes.values()]
      .map((node) => ({ ...node }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  allEdges(): SemanticEdge[] {
    return [...this.edges.values()]
      .map((edge) => ({
        ...edge,
        ...(edge.candidates === undefined
          ? {}
          : { candidates: [...edge.candidates] }),
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  findByKind(kind: ComponentKind): SemanticNode[] {
    return [...(this.byKind.get(kind) ?? [])]
      .map((id) => this.nodes.get(id))
      .filter((node): node is SemanticNode => node !== undefined);
  }

  outgoingEdges(id: NodeId, type?: EdgeType): SemanticEdge[] {
    return this.resolveEdgeIds(this.outgoing.get(id), type);
  }

  incomingEdges(id: NodeId, type?: EdgeType): SemanticEdge[] {
    return this.resolveEdgeIds(this.incoming.get(id), type);
  }

  unresolvedEdges(): SemanticEdge[] {
    return [...this.edges.values()].filter((edge) => edge.status === "unresolved");
  }

  ambiguousEdges(): SemanticEdge[] {
    return [...this.edges.values()].filter((edge) => edge.status === "ambiguous");
  }

  dependentsOf(id: NodeId): SemanticNode[] {
    return this.incomingEdges(id)
      .map((edge) => this.nodes.get(edge.from))
      .filter((node): node is SemanticNode => node !== undefined);
  }

  dependenciesOf(id: NodeId): SemanticNode[] {
    return this.outgoingEdges(id)
      .map((edge) => (edge.to ? this.nodes.get(edge.to) : undefined))
      .filter((node): node is SemanticNode => node !== undefined);
  }

  traceAffected(start: NodeId): Set<NodeId> {
    const affected = new Set<NodeId>();
    const queue: NodeId[] = [start];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || affected.has(current)) continue;
      affected.add(current);

      for (const edge of this.incomingEdges(current)) {
        if (!affected.has(edge.from)) queue.push(edge.from);
      }
    }

    return affected;
  }

  private resolveEdgeIds(ids: Set<string> | undefined, type?: EdgeType): SemanticEdge[] {
    if (!ids) return [];

    return [...ids]
      .map((edgeId) => this.edges.get(edgeId))
      .filter((edge): edge is SemanticEdge => edge !== undefined)
      .filter((edge) => (type ? edge.type === type : true));
  }
}
