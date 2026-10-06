import ts from "typescript";
import type {
  ParsedEntityDefinition,
} from "../../../../analyzers/entities/src/index.js";
import type {
  ParsedScriptFile,
} from "../../../../analyzers/scripts/src/index.js";
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

export type EntitySpawnPathKind =
  | "NATURAL_RULE"
  | "SCRIPT_SPAWN"
  | "COMMAND_SUMMON"
  | "PARENT_SPAWN_ENTITY"
  | "SPAWN_ON_DEATH";

export interface EntitySpawnPathClassification {
  readonly kind: EntitySpawnPathKind;
  readonly count: number;
}

export interface EntityDisappearanceClassification {
  readonly deathObservers: number;
  readonly removeObservers: number;
  readonly loadObservers: number;
  readonly classification:
    | "death-remove-load-separated"
    | "partial"
    | "absent";
}

export interface SpawnIntentAssessment {
  readonly scriptId: string;
  readonly objectName: string;
  readonly fields: readonly string[];
  readonly status:
    | "complete"
    | "incomplete";
  readonly missingFields:
    readonly string[];
}

export interface EntityPopulationSourceAnalysis {
  readonly autonomousSpawnSources:
    readonly AutonomousEntitySpawnSource[];
  readonly spawnEntitySources: number;
  readonly spawnOnDeathSources: number;
  readonly spawnPaths:
    readonly EntitySpawnPathClassification[];
  readonly disappearance:
    EntityDisappearanceClassification;
  readonly naturalSpawnIsolation:
    | "registry-isolated"
    | "natural-spawn-disabled"
    | "unresolved";
  readonly spawnIntents:
    readonly SpawnIntentAssessment[];
  readonly completeSpawnIntents: number;
  readonly incompleteSpawnIntents: number;
  readonly autonomousReplacementSources: number;
  readonly lineageInheritanceEvidence: number;
  readonly replacementLineage:
    | "explicit"
    | "declared-but-inheritance-unproven"
    | "not-applicable";
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


const REQUIRED_SPAWN_INTENT_FIELDS = [
  "arenaGeneration",
  "waveGeneration",
  "spawnOperationId",
  "expectedEntityType",
  "expectedCount",
] as const;

function spawnIntentAssessments(
  scripts: readonly ParsedScriptFile[],
): SpawnIntentAssessment[] {
  const output:
    SpawnIntentAssessment[] = [];

  for (const script of scripts) {
    const file = ts.createSourceFile(
      script.source.relativePath,
      script.text,
      ts.ScriptTarget.Latest,
      true,
      script.source.relativePath.endsWith(
        ".ts",
      )
        ? ts.ScriptKind.TS
        : ts.ScriptKind.JS,
    );

    const visit = (node: ts.Node): void => {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer &&
        ts.isObjectLiteralExpression(
          node.initializer,
        )
      ) {
        const fields =
          node.initializer.properties
            .flatMap((property) => {
              if (
                ts.isPropertyAssignment(
                  property,
                ) ||
                ts.isShorthandPropertyAssignment(
                  property,
                )
              ) {
                const name =
                  property.name;
                if (
                  ts.isIdentifier(name) ||
                  ts.isStringLiteralLike(
                    name,
                  )
                ) {
                  return [name.text];
                }
              }
              return [];
            });
        const matched =
          REQUIRED_SPAWN_INTENT_FIELDS
            .filter((field) =>
              fields.includes(field)
            );
        if (matched.length >= 2) {
          const missingFields =
            REQUIRED_SPAWN_INTENT_FIELDS
              .filter(
                (field) =>
                  !fields.includes(field),
              );
          output.push({
            scriptId:
              script.identifier,
            objectName:
              node.name.text,
            fields:
              [...fields].sort(),
            status:
              missingFields.length === 0
                ? "complete"
                : "incomplete",
            missingFields,
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
  }

  return output.sort((a, b) =>
    a.scriptId.localeCompare(
      b.scriptId,
    ) ||
    a.objectName.localeCompare(
      b.objectName,
    )
  );
}

function lineageInheritanceEvidence(
  scripts: readonly ParsedScriptFile[],
): number {
  return scripts.reduce(
    (sum, script) => {
      const text = script.text;
      const hasParentChildIdentity =
        /(?:parentEntityId|sourceEntityId|replacementOf|spawnedFrom)/.test(
          text,
        );
      const hasGeneration =
        /(?:arenaGeneration|entityGeneration|waveGeneration)/.test(
          text,
        );
      const hasRole =
        /(?:objectiveRole|scoringRole|arenaRole|objectiveMembership)/.test(
          text,
        );
      return sum +
        (
          hasParentChildIdentity &&
          hasGeneration &&
          hasRole
            ? 1
            : 0
        );
    },
    0,
  );
}

export function analyzeEntityPopulationSources(
  entities:
    readonly ParsedEntityDefinition[],
  scripts:
    readonly ParsedScriptFile[] = [],
  options: {
    naturalMobSpawning?:
      | "disabled"
      | "enabled"
      | "conflicted"
      | "unresolved";
    generationBoundRegistryAuthorities?: number;
  } = {},
): EntityPopulationSourceAnalysis {
  const sources:
    AutonomousEntitySpawnSource[] = [];
  const spawnIntents =
    spawnIntentAssessments(scripts);
  const lineageEvidence =
    lineageInheritanceEvidence(
      scripts,
    );

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

  const scriptSpawnCount =
    scripts.reduce(
      (sum, script) =>
        sum +
        script.methodCalls.filter(
          (call) =>
            call.method ===
            "spawnEntity",
        ).length,
      0,
    );
  const commandSummonCount =
    scripts.reduce(
      (sum, script) =>
        sum +
        script.commandLiterals.filter(
          (command) =>
            /^\/?summon\b/i.test(
              command.command.trim(),
            ),
        ).length,
      0,
    );
  const deathObservers =
    scripts.reduce(
      (sum, script) =>
        sum +
        script.eventSubscriptions.filter(
          (item) =>
            item.event ===
            "entityDie",
        ).length,
      0,
    );
  const removeObservers =
    scripts.reduce(
      (sum, script) =>
        sum +
        script.eventSubscriptions.filter(
          (item) =>
            item.event ===
            "entityRemove",
        ).length,
      0,
    );
  const loadObservers =
    scripts.reduce(
      (sum, script) =>
        sum +
        script.eventSubscriptions.filter(
          (item) =>
            item.event ===
            "entityLoad",
        ).length,
      0,
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
    spawnPaths: [
      {
        kind: "NATURAL_RULE",
        count:
          options.naturalMobSpawning ===
          "enabled"
            ? 1
            : 0,
      },
      {
        kind: "SCRIPT_SPAWN",
        count: scriptSpawnCount,
      },
      {
        kind: "COMMAND_SUMMON",
        count: commandSummonCount,
      },
      {
        kind: "PARENT_SPAWN_ENTITY",
        count:
          sources.filter(
            (item) =>
              item.kind ===
              "spawn-entity",
          ).length,
      },
      {
        kind: "SPAWN_ON_DEATH",
        count:
          sources.filter(
            (item) =>
              item.kind ===
              "spawn-on-death",
          ).length,
      },
    ],
    disappearance: {
      deathObservers,
      removeObservers,
      loadObservers,
      classification:
        deathObservers > 0 &&
        removeObservers > 0 &&
        loadObservers > 0
          ? "death-remove-load-separated"
          : deathObservers > 0 ||
              removeObservers > 0 ||
              loadObservers > 0
            ? "partial"
            : "absent",
    },
    naturalSpawnIsolation:
      (
        options.generationBoundRegistryAuthorities ??
        0
      ) > 0
        ? "registry-isolated"
        : options.naturalMobSpawning ===
            "disabled"
          ? "natural-spawn-disabled"
          : "unresolved",
    spawnIntents,
    completeSpawnIntents:
      spawnIntents.filter(
        (item) =>
          item.status === "complete",
      ).length,
    incompleteSpawnIntents:
      spawnIntents.filter(
        (item) =>
          item.status === "incomplete",
      ).length,
    autonomousReplacementSources:
      sources.length,
    lineageInheritanceEvidence:
      lineageEvidence,
    replacementLineage:
      sources.length === 0
        ? "not-applicable"
        : lineageEvidence > 0
          ? "explicit"
          : "declared-but-inheritance-unproven",
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
