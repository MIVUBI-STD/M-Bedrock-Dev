import { effectiveRelations } from "./effective.js";
import type {
  EffectiveKnowledgeProfile,
  KnowledgeCatalog,
  KnowledgeRelation,
  KnowledgeRelationKind,
} from "./types.js";

export interface KnowledgeGraphEdge {
  id: string;
  domain: KnowledgeRelation["domain"];
  kind: KnowledgeRelationKind;
  from: string;
  to: string;
  sourceIds: readonly string[];
  classification: KnowledgeRelation["classification"];
  diagnosticHint?: string;
  diagnosticSeverity?: KnowledgeRelation["diagnosticSeverity"];
}

export interface KnowledgeGraphPath {
  nodes: readonly string[];
  edges: readonly KnowledgeGraphEdge[];
}

export interface KnowledgeGraph {
  readonly nodes: ReadonlySet<string>;
  readonly edges: readonly KnowledgeGraphEdge[];
  outgoing(subject: string, kinds?: readonly KnowledgeRelationKind[]): readonly KnowledgeGraphEdge[];
  incoming(object: string, kinds?: readonly KnowledgeRelationKind[]): readonly KnowledgeGraphEdge[];
  dependencies(subject: string): readonly KnowledgeGraphEdge[];
  consequences(subject: string): readonly KnowledgeGraphEdge[];
  paths(from: string, to: string, maxDepth?: number): readonly KnowledgeGraphPath[];
}

const DEPENDENCY_KINDS = new Set<KnowledgeRelationKind>([
  "requires",
  "requires-any",
  "gates",
  "validates",
]);

const CONSEQUENCE_KINDS = new Set<KnowledgeRelationKind>([
  "produces",
  "activates",
  "deactivates",
  "supersedes",
  "delayed-until-tick",
  "runtime-built-in",
  "fallbacks-to",
  "restores",
  "queues-behind",
]);

function filterKinds(
  edges: readonly KnowledgeGraphEdge[],
  kinds?: readonly KnowledgeRelationKind[],
): readonly KnowledgeGraphEdge[] {
  if (!kinds || kinds.length === 0) return edges;
  const allowed = new Set(kinds);
  return edges.filter((edge) => allowed.has(edge.kind));
}

export function buildKnowledgeGraph(
  catalog: KnowledgeCatalog,
  profile: EffectiveKnowledgeProfile,
): KnowledgeGraph {
  const edges: KnowledgeGraphEdge[] = effectiveRelations(catalog, profile).map((relation) => ({
    id: relation.id,
    domain: relation.domain,
    kind: relation.kind,
    from: relation.subject,
    to: relation.object,
    sourceIds: relation.sourceIds,
    classification: relation.classification,
    ...(relation.diagnosticHint === undefined ? {} : { diagnosticHint: relation.diagnosticHint }),
    ...(relation.diagnosticSeverity === undefined
      ? {}
      : { diagnosticSeverity: relation.diagnosticSeverity }),
  }));

  const nodes = new Set<string>();
  const outgoingIndex = new Map<string, KnowledgeGraphEdge[]>();
  const incomingIndex = new Map<string, KnowledgeGraphEdge[]>();

  for (const edge of edges) {
    nodes.add(edge.from);
    nodes.add(edge.to);
    const out = outgoingIndex.get(edge.from) ?? [];
    out.push(edge);
    outgoingIndex.set(edge.from, out);
    const incoming = incomingIndex.get(edge.to) ?? [];
    incoming.push(edge);
    incomingIndex.set(edge.to, incoming);
  }

  const outgoing = (subject: string, kinds?: readonly KnowledgeRelationKind[]) =>
    filterKinds(outgoingIndex.get(subject) ?? [], kinds);
  const incoming = (object: string, kinds?: readonly KnowledgeRelationKind[]) =>
    filterKinds(incomingIndex.get(object) ?? [], kinds);

  const paths = (from: string, to: string, maxDepth = 6): readonly KnowledgeGraphPath[] => {
    if (maxDepth < 0) return [];
    const results: KnowledgeGraphPath[] = [];
    const visit = (
      node: string,
      pathNodes: string[],
      pathEdges: KnowledgeGraphEdge[],
      seen: Set<string>,
    ): void => {
      if (pathEdges.length > maxDepth) return;
      if (node === to && pathEdges.length > 0) {
        results.push({ nodes: [...pathNodes], edges: [...pathEdges] });
        return;
      }
      if (pathEdges.length === maxDepth) return;
      for (const edge of outgoingIndex.get(node) ?? []) {
        if (seen.has(edge.to)) continue;
        seen.add(edge.to);
        visit(edge.to, [...pathNodes, edge.to], [...pathEdges, edge], seen);
        seen.delete(edge.to);
      }
    };
    visit(from, [from], [], new Set([from]));
    return results;
  };

  return {
    nodes,
    edges,
    outgoing,
    incoming,
    dependencies: (subject) =>
      outgoing(subject).filter((edge) => DEPENDENCY_KINDS.has(edge.kind)),
    consequences: (subject) =>
      outgoing(subject).filter((edge) => CONSEQUENCE_KINDS.has(edge.kind)),
    paths,
  };
}
