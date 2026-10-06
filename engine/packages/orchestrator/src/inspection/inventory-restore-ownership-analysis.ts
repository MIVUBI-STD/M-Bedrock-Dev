import type {
  ParsedScriptFile,
  ScriptInventoryLifecycleEvidence,
} from "../../../../analyzers/scripts/src/index.js";

export type InventoryRestoreLifecycleEvent =
  | "player-spawn"
  | "player-join"
  | "entity-die";

export type PlayerSpawnRestoreScope =
  | "initial-only"
  | "respawn-only"
  | "all-spawns"
  | "unknown";

export interface InventoryRestorePathway {
  scriptId: string;
  lifecycleEvent: InventoryRestoreLifecycleEvent;
  sourceEvent: string;
  callbackRegion: string;
  reachableRegions: readonly string[];
  grantRegions: readonly string[];
  itemIdentifiers: readonly string[];
  unknownIdentityGrants: number;
  playerSpawnScope?: PlayerSpawnRestoreScope;
}

export interface InventoryRestoreOwnerConflict {
  lifecycleEvent: InventoryRestoreLifecycleEvent;
  itemIdentifier: string;
  ownerCallbackRegions: readonly string[];
  sourceEvents: readonly string[];
  reason: string;
}

export interface InventoryRestoreCrossLifecycleConflict {
  itemIdentifier: string;
  lifecycleEvents: readonly [
    "player-join",
    "player-spawn",
  ];
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
  initialSessionDuplicateOwners: number;
  initialSessionOverlapUnresolved: number;
  conflicts: readonly InventoryRestoreOwnerConflict[];
  crossLifecycleConflicts:
    readonly InventoryRestoreCrossLifecycleConflict[];
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

type InventoryRestoreScriptInput =
  | ParsedScriptFile
  | {
      parsed: ParsedScriptFile;
      text?: string;
    };

function normalizedScriptInput(
  input: InventoryRestoreScriptInput,
): {
  parsed: ParsedScriptFile;
  text?: string;
} {
  return "parsed" in input
    ? input
    : { parsed: input };
}

function sourceTextForEvent(
  text: string | undefined,
  event: ParsedScriptFile["events"][number],
): string {
  if (!text) return "";
  const source =
    event.callbackSource ?? event.source;
  const lines = text.split(/\r?\n/);
  const start = Math.max(
    0,
    (source.range?.lineStart ?? 1) - 1,
  );
  const end = Math.min(
    lines.length,
    source.range?.lineEnd ?? lines.length,
  );
  return lines.slice(start, end).join("\n");
}

function playerSpawnScope(
  text: string,
): PlayerSpawnRestoreScope {
  if (!text.trim()) return "unknown";
  if (!/\.initialSpawn\b/.test(text)) {
    return "all-spawns";
  }

  const initialOnly =
    /if\s*\(\s*!\s*[A-Za-z_$][\w$]*\.initialSpawn\s*\)\s*(?:\{\s*)?return\b/s.test(
      text,
    );
  if (initialOnly) return "initial-only";

  const respawnOnly =
    /if\s*\(\s*[A-Za-z_$][\w$]*\.initialSpawn\s*\)\s*(?:\{\s*)?return\b/s.test(
      text,
    );
  if (respawnOnly) return "respawn-only";

  return "unknown";
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
  input: InventoryRestoreScriptInput,
): InventoryRestorePathway[] {
  const { parsed: script, text } =
    normalizedScriptInput(input);
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
      ...(classified === "player-spawn"
        ? {
            playerSpawnScope:
              playerSpawnScope(
                sourceTextForEvent(
                  text,
                  event,
                ),
              ),
          }
        : {}),
    });
  }

  return output;
}

export function analyzeInventoryRestoreOwnership(
  scripts: readonly InventoryRestoreScriptInput[],
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

  const joinPathways = pathways.filter(
    (item) =>
      item.lifecycleEvent === "player-join",
  );
  const spawnPathways = pathways.filter(
    (item) =>
      item.lifecycleEvent === "player-spawn",
  );
  const crossLifecycleConflicts:
    InventoryRestoreCrossLifecycleConflict[] = [];
  let initialSessionOverlapUnresolved = 0;

  const allItems = [
    ...new Set(
      joinPathways.flatMap(
        (item) => item.itemIdentifiers,
      ),
    ),
  ].sort();

  for (const itemIdentifier of allItems) {
    const joins = joinPathways.filter(
      (item) =>
        item.itemIdentifiers.includes(
          itemIdentifier,
        ),
    );
    const spawns = spawnPathways.filter(
      (item) =>
        item.itemIdentifiers.includes(
          itemIdentifier,
        ),
    );
    if (joins.length === 0 || spawns.length === 0) {
      continue;
    }

    const provenInitialSpawns = spawns.filter(
      (item) =>
        item.playerSpawnScope ===
          "initial-only" ||
        item.playerSpawnScope ===
          "all-spawns",
    );
    const unresolvedInitialSpawns =
      spawns.filter(
        (item) =>
          item.playerSpawnScope ===
          "unknown",
      );

    if (provenInitialSpawns.length > 0) {
      crossLifecycleConflicts.push({
        itemIdentifier,
        lifecycleEvents: [
          "player-join",
          "player-spawn",
        ],
        ownerCallbackRegions: [
          ...new Set([
            ...joins.map(
              (item) =>
                item.callbackRegion,
            ),
            ...provenInitialSpawns.map(
              (item) =>
                item.callbackRegion,
            ),
          ]),
        ].sort(),
        sourceEvents: [
          ...new Set([
            ...joins.map(
              (item) => item.sourceEvent,
            ),
            ...provenInitialSpawns.map(
              (item) => item.sourceEvent,
            ),
          ]),
        ].sort(),
        reason:
          "The same deterministic item is granted from playerJoin and from a playerSpawn path that includes initial spawn. Both lifecycle events occur in one initial connection lifecycle, so the item has duplicate restore/grant ownership unless another source-proven idempotency guard prevents the second grant.",
      });
    } else if (
      unresolvedInitialSpawns.length > 0
    ) {
      initialSessionOverlapUnresolved += 1;
    }
  }

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
      conflicts.length +
      crossLifecycleConflicts.length,
    initialSessionDuplicateOwners:
      crossLifecycleConflicts.length,
    initialSessionOverlapUnresolved,
    conflicts,
    crossLifecycleConflicts,
  };
}
