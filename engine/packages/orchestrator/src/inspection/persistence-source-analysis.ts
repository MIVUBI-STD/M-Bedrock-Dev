import type {
  ParsedScriptFile,
} from "../../../../analyzers/scripts/src/index.js";

export interface PersistenceSourceProperty {
  scriptId: string;
  propertyId: string;
  growth:
    | "append-without-clear"
    | "append-with-clear"
    | "no-append"
    | "unknown";
  scope:
    | "player"
    | "entity"
    | "arena"
    | "session"
    | "world"
    | "unknown";
  lifetime:
    | "round"
    | "match"
    | "player-session"
    | "world"
    | "unknown";
  scopeConfidence:
    | "exact-receiver"
    | "name-pattern"
    | "unknown";
  lifetimeConfidence:
    | "bounded"
    | "unknown";
}

export interface PersistenceReconnectRestoreRisk {
  scriptId: string;
  propertyId: string;
  lifecycleEvent:
    | "playerJoin"
    | "playerSpawn";
  callbackRegion: string;
  scope:
    | "arena"
    | "session";
  reason: string;
}

export interface PersistenceResultAuditRecordAssessment {
  readonly scriptId: string;
  readonly propertyKey: string;
  readonly status:
    | "complete"
    | "partial";
  readonly semanticFields:
    readonly string[];
  readonly missingRequiredFields:
    readonly string[];
}

export interface PersistenceSourceAnalysis {
  properties: readonly PersistenceSourceProperty[];
  resultAuditRecords:
    readonly PersistenceResultAuditRecordAssessment[];
  completeResultAuditRecords: number;
  partialResultAuditRecords: number;
  reconnectTransientRestoreRisks:
    readonly PersistenceReconnectRestoreRisk[];
  appendWithoutClear: number;
  worldScopedAppendWithoutClear: number;
  unknownScope: number;
  unknownLifetime: number;
  reconnectTransientRestoreRiskCount: number;
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
): Set<string> {
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
  return seen;
}

function reconnectLifecycleEvent(
  event: string,
): "playerJoin" | "playerSpawn" | undefined {
  const normalized =
    event.replace(/[^A-Za-z0-9]/g, "")
      .toLowerCase();
  if (normalized === "playerjoin") {
    return "playerJoin";
  }
  if (normalized === "playerspawn") {
    return "playerSpawn";
  }
  return undefined;
}

export function analyzePersistenceSource(
  scripts: readonly ParsedScriptFile[],
): PersistenceSourceAnalysis {
  const properties: PersistenceSourceProperty[] = [];
  const reconnectTransientRestoreRisks:
    PersistenceReconnectRestoreRisk[] = [];

  for (const script of scripts) {
    const scopes = new Map(
      (script.persistentStateScopes ?? []).map((item) => [
        item.propertyId,
        item,
      ]),
    );
    const lifetimes = new Map(
      (script.persistentStateLifetimes ?? []).map((item) => [
        item.propertyId,
        item,
      ]),
    );

    for (
      const lifecycle of
        script.persistentDataLifecycleEvidence ?? []
    ) {
      const scope = scopes.get(lifecycle.propertyKey);
      const lifetime = lifetimes.get(lifecycle.propertyKey);

      properties.push({
        scriptId: script.identifier,
        propertyId: lifecycle.propertyKey,
        growth: lifecycle.growth,
        scope: scope?.scope ?? "unknown",
        lifetime: lifetime?.lifetime ?? "unknown",
        scopeConfidence:
          scope?.confidence ?? "unknown",
        lifetimeConfidence:
          lifetime?.confidence ?? "unknown",
      });
    }

    const graph = graphFor(script);
    const scopeByProperty = new Map(
      (script.persistentStateScopes ?? [])
        .map((item) => [
          item.propertyId,
          item.scope,
        ] as const),
    );

    for (const event of script.events) {
      const lifecycleEvent =
        reconnectLifecycleEvent(
          event.event,
        );
      if (
        lifecycleEvent === undefined ||
        event.callbackRegion === undefined
      ) {
        continue;
      }

      const reachableRegions =
        reachable(
          graph,
          event.callbackRegion,
        );

      for (
        const access of
          script.dynamicProperties
      ) {
        if (
          access.operation !== "get" ||
          access.propertyId === undefined ||
          access.executionRegion === undefined ||
          !reachableRegions.has(
            access.executionRegion,
          )
        ) {
          continue;
        }

        const scope =
          scopeByProperty.get(
            access.propertyId,
          );
        if (
          scope !== "session" &&
          scope !== "arena"
        ) {
          continue;
        }

        reconnectTransientRestoreRisks.push({
          scriptId:
            script.identifier,
          propertyId:
            access.propertyId,
          lifecycleEvent,
          callbackRegion:
            event.callbackRegion,
          scope,
          reason:
            "Reconnect/initial-spawn path reads persisted " +
            scope +
            "-scoped state without source proof that stale transient ownership is reconciled against the current session/arena generation.",
        });
      }
    }
  }

  properties.sort((a, b) =>
    a.scriptId.localeCompare(b.scriptId) ||
    a.propertyId.localeCompare(b.propertyId)
  );

  reconnectTransientRestoreRisks.sort((a, b) =>
    a.scriptId.localeCompare(b.scriptId) ||
    a.propertyId.localeCompare(b.propertyId) ||
    a.lifecycleEvent.localeCompare(
      b.lifecycleEvent,
    )
  );

  const resultAuditRecords =
    scripts.flatMap((script) =>
      (
        script.resultAuditRecordEvidence ??
        []
      ).map((item) => ({
        scriptId: script.identifier,
        propertyKey: item.propertyKey,
        status: item.status,
        semanticFields:
          [...item.semanticFields],
        missingRequiredFields:
          [...item.missingRequiredFields],
      }))
    ).sort((a, b) =>
      a.scriptId.localeCompare(b.scriptId) ||
      a.propertyKey.localeCompare(
        b.propertyKey,
      )
    );

  return {
    properties,
    resultAuditRecords,
    completeResultAuditRecords:
      resultAuditRecords.filter(
        (item) =>
          item.status === "complete",
      ).length,
    partialResultAuditRecords:
      resultAuditRecords.filter(
        (item) =>
          item.status === "partial",
      ).length,
    reconnectTransientRestoreRisks,
    appendWithoutClear:
      properties.filter(
        (item) =>
          item.growth ===
          "append-without-clear",
      ).length,
    worldScopedAppendWithoutClear:
      properties.filter(
        (item) =>
          item.growth ===
            "append-without-clear" &&
          item.scope === "world",
      ).length,
    unknownScope:
      properties.filter(
        (item) =>
          item.scope === "unknown",
      ).length,
    unknownLifetime:
      properties.filter(
        (item) =>
          item.lifetime === "unknown",
      ).length,
    reconnectTransientRestoreRiskCount:
      reconnectTransientRestoreRisks.length,
  };
}
