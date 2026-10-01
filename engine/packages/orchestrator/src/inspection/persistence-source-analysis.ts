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

export interface PersistenceSourceAnalysis {
  properties: readonly PersistenceSourceProperty[];
  appendWithoutClear: number;
  worldScopedAppendWithoutClear: number;
  unknownScope: number;
  unknownLifetime: number;
}

export function analyzePersistenceSource(
  scripts: readonly ParsedScriptFile[],
): PersistenceSourceAnalysis {
  const properties: PersistenceSourceProperty[] = [];

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
  }

  properties.sort((a, b) =>
    a.scriptId.localeCompare(b.scriptId) ||
    a.propertyId.localeCompare(b.propertyId)
  );

  return {
    properties,
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
  };
}
