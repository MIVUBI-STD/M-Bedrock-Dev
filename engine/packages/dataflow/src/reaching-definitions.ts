/**
 * Parser-independent forward may-reaching-definitions worklist.
 * Domain owners provide CFG and gen/kill/unknown transfers. An incomplete
 * branch is UNKNOWN, never proof that a value or effect is absent.
 */
export interface ReachingDefinitionsFlow {
  readonly entryId: string;
  readonly nodes: readonly { readonly id: string }[];
  readonly edges: readonly { readonly from: string; readonly to: string }[];
}

export interface ReachingDefinitionsTransfer {
  readonly generatedIds?: readonly string[];
  readonly killsPrevious?: boolean;
  readonly unknown?: boolean;
}

export function propagateReachingDefinitions(
  flow: ReachingDefinitionsFlow,
  readNodeId: string,
  transfers: ReadonlyMap<string, ReachingDefinitionsTransfer>,
  maxUpdates = 2048,
): {
  readonly status: "COMPLETE" | "UNKNOWN" | "TRUNCATED";
  readonly definitionIds: readonly string[];
} {
  const ids = new Set(flow.nodes.map(node => node.id));
  if (!ids.has(readNodeId) || !ids.has(flow.entryId) ||
      ids.size !== flow.nodes.length) {
    return { status: "UNKNOWN", definitionIds: [] };
  }
  const successors = new Map<string, string[]>();
  for (const edge of flow.edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to)) {
      return { status: "UNKNOWN", definitionIds: [] };
    }
    const list = successors.get(edge.from) ?? [];
    list.push(edge.to);
    successors.set(edge.from, list);
  }
  type State = { definitions: Set<string>; unknown: boolean };
  const values = new Map<string, State>();
  const pending: string[] = [];
  let cursor = 0;
  const receive = (id: string, defs: ReadonlySet<string>, unknown: boolean) => {
    const old = values.get(id);
    if (!old) {
      values.set(id, { definitions: new Set(defs), unknown });
      pending.push(id);
      return;
    }
    const additions = [...defs].filter(candidate => !old.definitions.has(candidate));
    if (additions.length === 0 && (!unknown || old.unknown)) return;
    additions.forEach(candidate => old.definitions.add(candidate));
    old.unknown ||= unknown;
    pending.push(id);
  };
  receive(flow.entryId, new Set(), false);
  let steps = 0;
  while (cursor < pending.length) {
    if (++steps > maxUpdates) return { status: "TRUNCATED", definitionIds: [] };
    const nodeId = pending[cursor++]!;
    const state = values.get(nodeId)!;
    // Target read observes the IN set before its containing statement.
    if (nodeId === readNodeId) continue;
    const action = transfers.get(nodeId);
    const output = action?.killsPrevious
      ? new Set<string>() : new Set(state.definitions);
    for (const id of action?.generatedIds ?? []) output.add(id);
    const uncertain = state.unknown || action?.unknown === true;
    for (const to of successors.get(nodeId) ?? []) {
      receive(to, output, uncertain);
    }
  }
  const result = values.get(readNodeId);
  if (!result || result.unknown) return { status: "UNKNOWN", definitionIds: [] };
  return { status: "COMPLETE", definitionIds: [...result.definitions].sort() };
}
