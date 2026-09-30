import type { SemanticEdge } from "../../../packages/graph/src/index.js";
import { createDiagnostic } from "../../../packages/diagnostics/src/index.js";
import type { DiagnosticFinding } from "../../../packages/diagnostics/src/index.js";

export function referenceDiagnostics(edges: readonly SemanticEdge[]): DiagnosticFinding[] {
  const findings: DiagnosticFinding[] = [];

  for (const edge of edges) {
    if (edge.status === "unresolved") {
      findings.push(createDiagnostic({
        code: "UNRESOLVED_REFERENCE",
        severity: "medium",
        message: `Unresolved ${edge.type} reference: ${edge.targetIdentifier}`,
        source: edge.evidence.source,
        relatedNodeIds: [edge.from],
        data: { edgeId: edge.id, targetIdentifier: edge.targetIdentifier, edgeType: edge.type },
      }));
    }

    if (edge.status === "ambiguous") {
      findings.push(createDiagnostic({
        code: "AMBIGUOUS_REFERENCE",
        severity: "medium",
        message: `Ambiguous ${edge.type} reference: ${edge.targetIdentifier}`,
        source: edge.evidence.source,
        relatedNodeIds: [edge.from, ...(edge.candidates ?? [])],
        data: { edgeId: edge.id, candidates: edge.candidates ?? [] },
      }));
    }
  }

  return findings;
}
