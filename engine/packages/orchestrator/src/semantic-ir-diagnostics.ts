import {
  createDiagnostic,
  type DiagnosticFinding,
} from "../../diagnostics/src/index.js";
import type { SemanticIr } from "../../semantic-ir/src/index.js";

function mutatingOperation(operation: string): boolean {
  return operation === "write" ||
    operation === "delete" ||
    operation === "clear";
}

export function semanticIrDiagnostics(
  ir: SemanticIr,
): DiagnosticFinding[] {
  const output: DiagnosticFinding[] = [];

  for (const edge of ir.execution.edges) {
    if (edge.resolution !== "unresolved") continue;

    output.push(createDiagnostic({
      code: "SEMANTIC_IR_EXECUTION_TARGET_UNRESOLVED",
      severity: "info",
      message:
        "Semantic IR cannot resolve execution target " +
        edge.targetLabel +
        "; downstream execution claims must remain unknown.",
      source: edge.source,
      relatedNodeIds: [edge.from],
      data: {
        subject: "execution-target:" + edge.targetLabel,
        object: "execution-target-resolved",
        semanticIrEdgeId: edge.id,
        fromExecutionRegionId: edge.from,
        targetLabel: edge.targetLabel,
        executionKind: edge.kind,
      },
    }));
  }

  const operationsByRegion = new Map<string, string[]>();
  for (const operation of ir.state.operations) {
    if (!mutatingOperation(operation.operation)) continue;
    const list = operationsByRegion.get(operation.executionRegionId) ?? [];
    list.push(operation.surfaceId);
    operationsByRegion.set(operation.executionRegionId, list);
  }

  for (const relation of ir.temporal.relations) {
    if (
      relation.kind !== "deferred" &&
      relation.kind !== "periodic"
    ) {
      continue;
    }
    if (relation.guardEvidence === "explicit-generation-check") {
      continue;
    }
    if (!relation.to) continue;

    const mutatedSurfaces = [
      ...new Set(operationsByRegion.get(relation.to) ?? []),
    ].sort();
    if (mutatedSurfaces.length === 0) continue;

    output.push(createDiagnostic({
      code: "SEMANTIC_IR_DEFERRED_STATE_GUARD_UNKNOWN",
      severity: "minor",
      message:
        "Deferred state mutation has no proven generation/ownership guard; stale callback risk requires runtime proof.",
      source: relation.source,
      relatedNodeIds: [relation.from, relation.to],
      data: {
        subject: "deferred-state-mutation:" + relation.id,
        object: "current-generation-ownership-proof",
        semanticIrRelationId: relation.id,
        fromExecutionRegionId: relation.from,
        toExecutionRegionId: relation.to,
        mutatedStateSurfaceIds: mutatedSurfaces,
        temporalKind: relation.kind,
      },
    }));
  }

  return output.sort((a, b) => a.id.localeCompare(b.id));
}
