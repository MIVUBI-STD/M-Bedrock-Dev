import { buildKnowledgeGraph } from "./graph.js";
import type {
  EffectiveKnowledgeProfile,
  KnowledgeCatalog,
} from "./types.js";
import type { KnowledgeGraphEdge } from "./graph.js";
export type CompiledInvariantKind =
  | "requires-state"
  | "requires-any-state"
  | "gated-state"
  | "deactivates-state"
  | "restores-state"
  | "temporal-order";

export interface CompiledDiagnosticInvariant {
  id: string;
  relationId: string;
  relationKind: KnowledgeGraphEdge["kind"];
  invariantKind: CompiledInvariantKind;
  domain: KnowledgeGraphEdge["domain"];
  subject: string;
  object: string;
  alternatives?: readonly string[];
  expectedObjectState?: "present" | "absent";
  beforePredicate?: string;
  afterPredicate?: string;
  classification?: KnowledgeGraphEdge["classification"];
  diagnosticSeverity?: KnowledgeGraphEdge["diagnosticSeverity"];
  knowledgeSourceIds: readonly string[];
  rationale?: string;
}

export interface InvariantCompilationSkip {
  relationId: string;
  relationKind: KnowledgeGraphEdge["kind"];
  reason: string;
}

export interface InvariantCompilationResult {
  invariants: readonly CompiledDiagnosticInvariant[];
  skipped: readonly InvariantCompilationSkip[];
}

function base(
  edge: KnowledgeGraphEdge,
): Omit<
  CompiledDiagnosticInvariant,
  "id" | "invariantKind"
> {
  return {
    relationId: edge.id,
    relationKind: edge.kind,
    domain: edge.domain,
    subject: edge.from,
    object: edge.to,
    ...(edge.classification === undefined
      ? {}
      : { classification: edge.classification }),
    ...(edge.diagnosticSeverity === undefined
      ? {}
      : { diagnosticSeverity: edge.diagnosticSeverity }),
    knowledgeSourceIds: edge.sourceIds,
    ...(edge.diagnosticHint === undefined
      ? {}
      : { rationale: edge.diagnosticHint }),
  };
}

function invariantId(edge: KnowledgeGraphEdge): string {
  return "invariant::" + edge.id;
}

function alternatives(value: string): string[] {
  return value
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function compileEdge(
  edge: KnowledgeGraphEdge,
): CompiledDiagnosticInvariant | undefined {
  const common = base(edge);

  switch (edge.kind) {
    case "requires":
      return {
        ...common,
        id: invariantId(edge),
        invariantKind: "requires-state",
        expectedObjectState: "present",
      };

    case "requires-any": {
      const choices = alternatives(edge.to);
      if (choices.length < 2) return undefined;
      return {
        ...common,
        id: invariantId(edge),
        invariantKind: "requires-any-state",
        alternatives: choices,
      };
    }

    case "gates":
      return {
        ...common,
        id: invariantId(edge),
        invariantKind: "gated-state",
        expectedObjectState: "present",
      };

    case "deactivates":
      return {
        ...common,
        id: invariantId(edge),
        invariantKind: "deactivates-state",
        expectedObjectState: "absent",
      };

    case "restores":
      return {
        ...common,
        id: invariantId(edge),
        invariantKind: "restores-state",
        expectedObjectState: "present",
      };

    case "queues-behind":
      return {
        ...common,
        id: invariantId(edge),
        invariantKind: "temporal-order",
        beforePredicate: edge.to,
        afterPredicate: edge.from,
      };

    default:
      return undefined;
  }
}

export function compileKnowledgeInvariants(
  catalog: KnowledgeCatalog,
  profile: EffectiveKnowledgeProfile,
): InvariantCompilationResult {
  const graph = buildKnowledgeGraph(catalog, profile);
  const invariants: CompiledDiagnosticInvariant[] = [];
  const skipped: InvariantCompilationResult["skipped"][number][] = [];

  for (const edge of graph.edges) {
    const invariant = compileEdge(edge);
    if (invariant) {
      invariants.push(invariant);
      continue;
    }

    skipped.push({
      relationId: edge.id,
      relationKind: edge.kind,
      reason:
        edge.kind === "requires-any"
          ? "requires-any relation has fewer than two alternatives."
          : "Relation kind does not have a lossless executable invariant mapping.",
    });
  }

  return {
    invariants: invariants.sort((a, b) => a.id.localeCompare(b.id)),
    skipped: skipped.sort((a, b) => a.relationId.localeCompare(b.relationId)),
  };
}
