import type {
  ParsedScriptFile,
  ScriptInventoryLifecycleEvidence,
} from "../../../../analyzers/scripts/src/index.js";

export type InventoryRestoreLifecycleEvent =
  | "player-spawn"
  | "player-join"
  | "entity-die";

export interface InventoryRestorePathway {
  scriptId: string;
  lifecycleEvent: InventoryRestoreLifecycleEvent;
  sourceEvent: string;
  callbackRegion: string;
  reachableRegions: readonly string[];
  grantRegions: readonly string[];
  itemIdentifiers: readonly string[];
  unknownIdentityGrants: number;
}

export interface InventoryRestoreOwnerConflict {
  lifecycleEvent: InventoryRestoreLifecycleEvent;
  itemIdentifier: string;
  ownerCallbackRegions: readonly string[];
  sourceEvents: readonly string[];
  reason: string;
}

export interface InventoryRestoreOwnershipAnalysis {
  pathways: readonly InventoryRestorePathway[];
  restorePathways: number;
  deterministicItemRestores: number;
  unknownIdentityGrants: number;
  multipleRestoreOwners: number;
  conflicts: readonly InventoryRestoreOwnerConflict[];
}

function lifecycleEvent(
  event: string,
): InventoryRestoreLifecycleEvent | undefined {
  const normalized =
    event.replace(/[^A-Za-z0-9]/g, "")
      .toLowerCase();

  if (normalized === "playerspawn") {
    return "player-spawn";
  }
  if (normalized === "playerjoin") {
    return "player-join";
  }
  if (normalized === "entitydie") {
    return "entity-die";
  }
  return undefined;
}

function graphFor(
  script: ParsedScriptFile,
): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  for (const call of script.localFunctionCalls) {
    const next =
      graph.get(call.callerRegion) ??
      new Set<string>();
    next.add(call.targetRegion);
    graph.set(call.callerRegion, next);
  }
  return graph;
}

function reachable(
  graph: ReadonlyMap<string, ReadonlySet<string>>,
  root: string,
): string[] {
  const seen = new Set<string>([root]);
  const queue = [root];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of graph.get(current) ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }

  return [...seen].sort();
}

function grantEvidence(
  script: ParsedScriptFile,
): ScriptInventoryLifecycleEvidence[] {
  return (
    script.inventoryLifecycleEvidence ?? []
  ).filter(
    (item) =>
      item.kind === "item-grant" ||
      item.kind === "equipment-set",
  );
}

function analyzeScript(
  script: ParsedScriptFile,
): InventoryRestorePathway[] {
  const graph = graphFor(script);
  const grants = grantEvidence(script);
  const output: InventoryRestorePathway[] = [];

  for (const event of script.events) {
    const classified =
      lifecycleEvent(event.event);
    if (
      classified === undefined ||
      event.callbackRegion === undefined
    ) {
      continue;
    }

    const regions = reachable(
      graph,
      event.callbackRegion,
    );
    const reachableGrants = grants.filter(
      (grant) =>
        regions.includes(
          grant.executionRegion,
        ),
    );

    if (reachableGrants.length === 0) {
      continue;
    }

    output.push({
      scriptId: script.identifier,
      lifecycleEvent: classified,
      sourceEvent: event.event,
      callbackRegion: event.callbackRegion,
      reachableRegions: regions,
      grantRegions: [
        ...new Set(
          reachableGrants.map(
            (grant) =>
              grant.executionRegion,
          ),
        ),
      ].sort(),
      itemIdentifiers: [
        ...new Set(
          reachableGrants.flatMap(
            (grant) =>
              grant.itemIdentifier === undefined
                ? []
                : [grant.itemIdentifier],
          ),
        ),
      ].sort(),
      unknownIdentityGrants:
        reachableGrants.filter(
          (grant) =>
            grant.itemIdentifier === undefined,
        ).length,
    });
  }

  return output;
}

export function analyzeInventoryRestoreOwnership(
  scripts: readonly ParsedScriptFile[],
): InventoryRestoreOwnershipAnalysis {
  const pathways = scripts
    .flatMap(analyzeScript)
    .sort((a, b) =>
      a.lifecycleEvent.localeCompare(
        b.lifecycleEvent,
      ) ||
      a.scriptId.localeCompare(b.scriptId) ||
      a.callbackRegion.localeCompare(
        b.callbackRegion,
      )
    );

  const owners = new Map<
    string,
    {
      lifecycleEvent: InventoryRestoreLifecycleEvent;
      itemIdentifier: string;
      callbackRegions: Set<string>;
      sourceEvents: Set<string>;
    }
  >();

  for (const pathway of pathways) {
    for (
      const itemIdentifier of
        pathway.itemIdentifiers
    ) {
      const key =
        pathway.lifecycleEvent +
        "|" +
        itemIdentifier;
      const current = owners.get(key) ?? {
        lifecycleEvent:
          pathway.lifecycleEvent,
        itemIdentifier,
        callbackRegions: new Set<string>(),
        sourceEvents: new Set<string>(),
      };
      current.callbackRegions.add(
        pathway.callbackRegion,
      );
      current.sourceEvents.add(
        pathway.sourceEvent,
      );
      owners.set(key, current);
    }
  }

  const conflicts: InventoryRestoreOwnerConflict[] =
    [...owners.values()]
      .filter(
        (item) =>
          item.callbackRegions.size > 1,
      )
      .map((item) => ({
        lifecycleEvent:
          item.lifecycleEvent,
        itemIdentifier:
          item.itemIdentifier,
        ownerCallbackRegions: [
          ...item.callbackRegions,
        ].sort(),
        sourceEvents: [
          ...item.sourceEvents,
        ].sort(),
        reason:
          "The same deterministic item class is granted from multiple callback owners for the same lifecycle event; generation-scoped restore ownership requires review.",
      }))
      .sort((a, b) =>
        a.lifecycleEvent.localeCompare(
          b.lifecycleEvent,
        ) ||
        a.itemIdentifier.localeCompare(
          b.itemIdentifier,
        )
      );

  return {
    pathways,
    restorePathways: pathways.length,
    deterministicItemRestores:
      pathways.reduce(
        (sum, item) =>
          sum +
          item.itemIdentifiers.length,
        0,
      ),
    unknownIdentityGrants:
      pathways.reduce(
        (sum, item) =>
          sum +
          item.unknownIdentityGrants,
        0,
      ),
    multipleRestoreOwners:
      conflicts.length,
    conflicts,
  };
}
