import type { SemanticIr, StateOperationKind } from "./types.js";

export function semanticIrSummary(ir: SemanticIr) {
  const byOperation = (operation: StateOperationKind) =>
    ir.state.operations.filter((item) => item.operation === operation).length;

  return {
    executionRegions: ir.execution.regions.length,
    executionEdges: ir.execution.edges.length,
    unresolvedExecutionTargets: ir.execution.edges.filter(
      (item) => item.resolution === "unresolved",
    ).length,
    eventDispatches: ir.execution.edges.filter(
      (item) => item.kind === "event-dispatch",
    ).length,
    deferredEdges: ir.execution.edges.filter(
      (item) => item.kind === "deferred" || item.kind === "periodic",
    ).length,
    stateSurfaces: ir.state.surfaces.length,
    stateOperations: ir.state.operations.length,
    stateReads: byOperation("read"),
    stateWrites: byOperation("write"),
    stateDeletes: byOperation("delete") + byOperation("clear"),
    authorityContracts: ir.state.authorityBindings.length,
    temporalRelations: ir.temporal.relations.length,
    guardedDeferredRelations: ir.temporal.relations.filter(
      (item) =>
        (item.kind === "deferred" || item.kind === "periodic") &&
        item.guardEvidence === "explicit-generation-check",
    ).length,
    unguardedDeferredRelations: ir.temporal.relations.filter(
      (item) =>
        (item.kind === "deferred" || item.kind === "periodic") &&
        item.guardEvidence !== "explicit-generation-check",
    ).length,
  };
}
