import type { SemanticIr, StateOperationKind } from "./types.js";

export interface ObservedExecutionTrace {
  /** Authored entry candidate, NOT proof that gameplay actually executed. */
  readonly entryRegionId: string;
  readonly entryKind: SemanticIr["execution"]["regions"][number]["kind"];
  readonly regionIds: readonly string[];
  readonly executionEdgeIds: readonly string[];
  readonly unresolvedExecutionEdgeIds: readonly string[];
  readonly temporalRelationIds: readonly string[];
  readonly stateOperationIds: readonly string[];
}

/**
 * Traverse exact, resolved IR edges from authored event sources, modules and
 * unreferenced mcfunctions. This is a source-observed execution topology, not
 * a predicted player journey or a runtime trace. Unresolved targets are never
 * traversed and unreachable callbacks remain explicitly outside traces.
 */
export function semanticIrExecutionTraces(ir: SemanticIr): {
  readonly traces: readonly ObservedExecutionTrace[];
  readonly regionsOutsideTraces: readonly string[];
} {
  const sorted = (items: Iterable<string>) =>
    [...new Set(items)].sort();
  const regions = new Map(ir.execution.regions.map(r => [r.id, r]));
  const outgoing = new Map<string, typeof ir.execution.edges[number][]>();
  for (const edge of ir.execution.edges) {
    const list = outgoing.get(edge.from) ?? [];
    list.push(edge);
    outgoing.set(edge.from, list);
  }
  const operations = new Map<string, typeof ir.state.operations[number][]>();
  for (const operation of ir.state.operations) {
    const list = operations.get(operation.executionRegionId) ?? [];
    list.push(operation);
    operations.set(operation.executionRegionId, list);
  }
  const temporal = new Map(ir.temporal.relations.map(item => [item.id, item]));
  const incoming = new Set(ir.execution.edges
    .filter(edge => edge.resolution === "resolved" && edge.to !== undefined)
    .map(edge => edge.to!));
  const entryRegions = [...regions.values()].filter(region =>
    region.kind === "event-source" ||
    region.kind === "script-module" ||
    (region.kind === "mcfunction" && !incoming.has(region.id))
  ).sort((a, b) => a.id.localeCompare(b.id));
  const coveredRegions = new Set<string>();
  const traces: ObservedExecutionTrace[] = entryRegions.map(entry => {
    const visited = new Set<string>([entry.id]);
    const queued = [entry.id];
    const edges = new Set<string>();
    const unresolved = new Set<string>();
    const times = new Set<string>();
    const state = new Set<string>();
    for (let index = 0; index < queued.length; index += 1) {
      const regionId = queued[index]!;
      coveredRegions.add(regionId);
      for (const op of operations.get(regionId) ?? []) state.add(op.id);
      for (const edge of outgoing.get(regionId) ?? []) {
        edges.add(edge.id);
        if (edge.resolution !== "resolved") unresolved.add(edge.id);
        const relation = temporal.get("time:" + edge.id);
        if (relation && relation.from === edge.from &&
          relation.to === edge.to && relation.targetLabel === edge.targetLabel) {
          times.add(relation.id);
        }
        if (edge.resolution === "resolved" && edge.to &&
            regions.has(edge.to) && !visited.has(edge.to)) {
          visited.add(edge.to);
          queued.push(edge.to);
        }
      }
    }
    return {
      entryRegionId: entry.id,
      entryKind: entry.kind,
      regionIds: sorted(visited),
      executionEdgeIds: sorted(edges),
      unresolvedExecutionEdgeIds: sorted(unresolved),
      temporalRelationIds: sorted(times),
      stateOperationIds: sorted(state),
    };
  });
  return {
    traces,
    regionsOutsideTraces: sorted([...regions.keys()]
      .filter(id => !coveredRegions.has(id))),
  };
}


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
