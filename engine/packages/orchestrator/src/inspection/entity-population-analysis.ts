import type {
  ParsedEntityDefinition,
} from "../../../../analyzers/entities/src/index.js";
import {
  createDiagnostic,
  type DiagnosticFinding,
} from "../../../diagnostics/src/index.js";

export type AutonomousEntitySpawnKind =
  | "spawn-entity"
  | "spawn-on-death";

export interface AutonomousEntitySpawnSource {
  readonly entityIdentifier?: string;
  readonly sourcePath: string;
  readonly kind: AutonomousEntitySpawnKind;
  readonly component: string;
  readonly scope:
    | "base"
    | "component-group";
  readonly componentGroup?: string;
}

export interface EntityPopulationSourceAnalysis {
  readonly autonomousSpawnSources:
    readonly AutonomousEntitySpawnSource[];
  readonly spawnEntitySources: number;
  readonly spawnOnDeathSources: number;
}

function autonomousSpawnKind(
  component: string,
): AutonomousEntitySpawnKind | undefined {
  const normalized =
    component.toLowerCase();
  if (
    normalized ===
      "minecraft:spawn_entity" ||
    normalized ===
      "minecraft:behavior.spawn_entity"
  ) {
    return "spawn-entity";
  }
  if (
    normalized ===
    "minecraft:spawn_on_death"
  ) {
    return "spawn-on-death";
  }
  return undefined;
}

export function analyzeEntityPopulationSources(
  entities:
    readonly ParsedEntityDefinition[],
): EntityPopulationSourceAnalysis {
  const sources:
    AutonomousEntitySpawnSource[] = [];

  for (const entity of entities) {
    for (
      const component of
        entity.baseComponents
    ) {
      const kind =
        autonomousSpawnKind(component);
      if (!kind) continue;
      sources.push({
        ...(entity.identifier ===
          undefined
          ? {}
          : {
              entityIdentifier:
                entity.identifier,
            }),
        sourcePath:
          entity.source.relativePath,
        kind,
        component,
        scope: "base",
      });
    }

    for (
      const [
        componentGroup,
        components,
      ] of Object.entries(
        entity.componentGroups,
      )
    ) {
      for (const component of components) {
        const kind =
          autonomousSpawnKind(
            component,
          );
        if (!kind) continue;
        sources.push({
          ...(entity.identifier ===
            undefined
            ? {}
            : {
                entityIdentifier:
                  entity.identifier,
              }),
          sourcePath:
            entity.source.relativePath,
          kind,
          component,
          scope:
            "component-group",
          componentGroup,
        });
      }
    }
  }

  sources.sort((a, b) =>
    a.sourcePath.localeCompare(
      b.sourcePath,
    ) ||
    (a.entityIdentifier ?? "")
      .localeCompare(
        b.entityIdentifier ?? "",
      ) ||
    a.kind.localeCompare(b.kind) ||
    (a.componentGroup ?? "")
      .localeCompare(
        b.componentGroup ?? "",
      )
  );

  return {
    autonomousSpawnSources: sources,
    spawnEntitySources:
      sources.filter(
        (item) =>
          item.kind ===
          "spawn-entity",
      ).length,
    spawnOnDeathSources:
      sources.filter(
        (item) =>
          item.kind ===
          "spawn-on-death",
      ).length,
  };
}

export function entityPopulationSourceDiagnostics(
  analysis:
    EntityPopulationSourceAnalysis,
): DiagnosticFinding[] {
  if (
    analysis.autonomousSpawnSources
      .length === 0
  ) {
    return [];
  }

  return [
    createDiagnostic({
      code:
        "ENTITY_AUTONOMOUS_SPAWN_SOURCE",
      severity: "info",
      message:
        "Entity definitions contain autonomous spawn components that can create population outside direct arena script spawn paths; include them in population accounting and replacement-lineage review.",
      data: {
        spawnEntitySources:
          analysis.spawnEntitySources,
        spawnOnDeathSources:
          analysis.spawnOnDeathSources,
        sources:
          analysis.autonomousSpawnSources
            .map((item) => ({
              entityIdentifier:
                item.entityIdentifier,
              sourcePath:
                item.sourcePath,
              kind: item.kind,
              scope: item.scope,
              component:
                item.component,
              componentGroup:
                item.componentGroup,
            })),
      },
    }),
  ];
}
