import type { ParsedEntityDefinition } from "../../../../analyzers/entities/src/index.js";
import type { ParsedScriptFile } from "../../../../analyzers/scripts/src/index.js";

export interface EnvironmentHazardAnalysis {
  explosionBeforeHandlers: number;
  explosionAfterHandlers: number;
  hurtOnConditionEntities: number;
  damageSensorEntities: number;
  hazardEntities: readonly {
    entityIdentifier?: string;
    sourcePath: string;
    hurtOnCondition: boolean;
    damageSensor: boolean;
  }[];
  explosionControlStatus:
    | "pre-mutation-control-present"
    | "post-only"
    | "absent";
  explosionContainmentStatus:
    | "unresolved"
    | "not-applicable";
  repeatedDamageStatus:
    | "generation-policy-unresolved"
    | "not-applicable";
}

function hasComponent(
  entity: ParsedEntityDefinition,
  component: string,
): boolean {
  if (entity.baseComponents.includes(component)) return true;
  return Object.values(entity.componentGroups).some(
    (components) => components.includes(component),
  );
}

export function analyzeEnvironmentHazards(
  scripts: readonly ParsedScriptFile[],
  entities: readonly ParsedEntityDefinition[],
): EnvironmentHazardAnalysis {
  const explosionBeforeHandlers = scripts.reduce(
    (sum, script) =>
      sum +
      script.events.filter(
        (event) =>
          event.root === "world" &&
          event.phase === "beforeEvents" &&
          event.event === "explosion",
      ).length,
    0,
  );
  const explosionAfterHandlers = scripts.reduce(
    (sum, script) =>
      sum +
      script.events.filter(
        (event) =>
          event.root === "world" &&
          event.phase === "afterEvents" &&
          event.event === "explosion",
      ).length,
    0,
  );

  const hazardEntities = entities
    .map((entity) => ({
      ...(entity.identifier === undefined
        ? {}
        : { entityIdentifier: entity.identifier }),
      sourcePath: entity.source.relativePath,
      hurtOnCondition: hasComponent(
        entity,
        "minecraft:hurt_on_condition",
      ),
      damageSensor: hasComponent(
        entity,
        "minecraft:damage_sensor",
      ),
    }))
    .filter(
      (item) =>
        item.hurtOnCondition ||
        item.damageSensor,
    )
    .sort((a, b) =>
      a.sourcePath.localeCompare(b.sourcePath),
    );

  const hurtOnConditionEntities =
    hazardEntities.filter(
      (item) => item.hurtOnCondition,
    ).length;
  const damageSensorEntities =
    hazardEntities.filter(
      (item) => item.damageSensor,
    ).length;
  const hasExplosion =
    explosionBeforeHandlers > 0 ||
    explosionAfterHandlers > 0;

  return {
    explosionBeforeHandlers,
    explosionAfterHandlers,
    hurtOnConditionEntities,
    damageSensorEntities,
    hazardEntities,
    explosionControlStatus:
      explosionBeforeHandlers > 0
        ? "pre-mutation-control-present"
        : explosionAfterHandlers > 0
          ? "post-only"
          : "absent",
    explosionContainmentStatus:
      hasExplosion
        ? "unresolved"
        : "not-applicable",
    repeatedDamageStatus:
      hurtOnConditionEntities > 0
        ? "generation-policy-unresolved"
        : "not-applicable",
  };
}
