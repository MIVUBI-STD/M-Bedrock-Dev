import type { SourceSequentialSite } from "../../project-model/src/index.js";
import type { SourceControlFlowRegion, StateOperation, StateSurface } from "../../semantic-ir/src/index.js";

/**
 * Bounded forward union/kill over source CFG.
 * Transfer facts are exact direct writes to one imported world singleton/key.
 * Opaque effects, ambiguous aliases and truncated paths preserve UNKNOWN.
 */
export function reachingSourceWorldDefinitions(input: {
  readonly flow?: SourceControlFlowRegion;
  readonly read: StateOperation;
  readonly writes: readonly StateOperation[];
  readonly surfaces: readonly StateSurface[];
  readonly maxUpdates?: number;
}): { readonly status: "COMPLETE" | "UNKNOWN" | "TRUNCATED"; readonly writeIds: readonly string[] } {
  const { flow, read } = input;
  if (!flow || read.sourceSequence?.stableWorldReceiver !== true ||
      !read.targetHint || !read.sourceSequence || read.operation !== "read") {
    return { status: "UNKNOWN", writeIds: [] };
  }
  const sourceSiteKey = (s: SourceSequentialSite): string =>
    JSON.stringify([s.block.artifactId, s.block.relativePath,
      s.block.jsonPointer ?? null, s.block.range ?? null, s.statementIndex]);
  const readKey = sourceSiteKey(read.sourceSequence);
  const readNodes = flow.nodes.filter(node =>
    node.site && sourceSiteKey(node.site) === readKey);
  if (readNodes.length !== 1 || flow.executionRegionId !== read.executionRegionId) {
    return { status: "UNKNOWN", writeIds: [] };
  }
  const allWrites = input.writes.filter(write =>
    write.executionRegionId === read.executionRegionId &&
    write.operation === "write");
  const surfaces = new Map(input.surfaces.map(surface => [surface.id, surface.ref]));
  const wildcard = allWrites.some(write =>
    surfaces.get(write.surfaceId)?.kind === "dynamic-property" &&
    surfaces.get(write.surfaceId)?.key === "*" &&
    write.targetHint === read.targetHint);
  if (wildcard) return { status: "UNKNOWN", writeIds: [] };
  const relevant = allWrites.filter(write => write.surfaceId === read.surfaceId);
  if (relevant.some(write => write.targetHint !== read.targetHint ||
      write.sourceSequence?.stableWorldReceiver !== true ||
      !write.sourceSequence.directCall)) {
    return { status: "UNKNOWN", writeIds: [] };
  }
  const bySite = new Map<string, StateOperation[]>();
  for (const write of relevant) {
    const site = write.sourceSequence!;
    const key = sourceSiteKey(site);
    const next = bySite.get(key) ?? [];
    next.push(write);
    bySite.set(key, next);
  }
  const nodes = new Map(flow.nodes.map(node => [node.id, node]));
  const outgoing = new Map<string, string[]>();
  for (const edge of flow.edges) {
    const list = outgoing.get(edge.from) ?? [];
    list.push(edge.to);
    outgoing.set(edge.from, list);
  }
  type State = { defs: Set<string>; unknown: boolean };
  const states = new Map<string, State>();
  const queue: string[] = [];
  const admit = (id: string, defs: ReadonlySet<string>, unknown: boolean) => {
    const previous = states.get(id);
    if (!previous) {
      states.set(id, { defs: new Set(defs), unknown });
      queue.push(id);
      return;
    }
    const added = [...defs].some(value => !previous.defs.has(value));
    if (!added && (!unknown || previous.unknown)) return;
    for (const value of defs) previous.defs.add(value);
    previous.unknown ||= unknown;
    queue.push(id);
  };
  admit(flow.entryId, new Set(), false);
  let updates = 0;
  const limit = input.maxUpdates ?? 2048;
  while (queue.length) {
    if (++updates > limit) return { status: "TRUNCATED", writeIds: [] };
    const id = queue.shift()!;
    const node = nodes.get(id);
    const state = states.get(id);
    if (!node || !state) return { status: "UNKNOWN", writeIds: [] };
    // Read is evaluated on entry to its containing source statement.
    if (id === readNodes[0]!.id) continue;
    let unknown = state.unknown || node.kind === "opaque";
    let definitions = state.defs;
    if (node.site) {
      const writes = bySite.get(sourceSiteKey(node.site)) ?? [];
      if (writes.length > 1) unknown = true;
      if (writes.length === 1) {
        definitions = new Set([writes[0]!.id]);
      }
    }
    for (const successor of outgoing.get(id) ?? []) {
      admit(successor, definitions, unknown);
    }
  }
  const reached = states.get(readNodes[0]!.id);
  if (!reached || reached.unknown) return { status: "UNKNOWN", writeIds: [] };
  return { status: "COMPLETE", writeIds: [...reached.defs].sort() };
}
