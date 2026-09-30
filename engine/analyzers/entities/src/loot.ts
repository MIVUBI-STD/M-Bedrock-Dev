import {
  deriveEntityStateGraph,
} from "./state-graph.js";
import type {
  ParsedEntityDefinition,
} from "./types.js";

export interface EntityLootStateSemantics {
  stateId: string;
  lootTable?: string;
  configured: boolean;
}

export interface EntityLootSemantics {
  entityKey: string;
  states: readonly EntityLootStateSemantics[];
  configuredStates: number;
  lootTables: readonly string[];
}

function asRecord(
  value: unknown,
): Record<string, unknown> | undefined {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  )
    ? value as Record<string, unknown>
    : undefined;
}

function entityKey(
  entity: ParsedEntityDefinition,
): string {
  return (
    entity.identifier ??
    entity.runtimeIdentifier ??
    entity.source.relativePath
  );
}

function lootTableFrom(
  value: unknown,
): string | undefined {
  const record = asRecord(value);
  const table = record?.table;
  return (
    typeof table === "string" &&
    table.trim().length > 0
  )
    ? table
    : undefined;
}

export function extractEntityLootSemantics(
  entity: ParsedEntityDefinition,
): EntityLootSemantics {
  const states =
    deriveEntityStateGraph(entity)
      .candidates
      .map((state): EntityLootStateSemantics => {
        const configured =
          state.activeComponents.includes(
            "minecraft:loot",
          );
        const lootTable =
          configured
            ? lootTableFrom(
                state.activeComponentData[
                  "minecraft:loot"
                ],
              )
            : undefined;
        return {
          stateId: state.id,
          configured,
          ...(lootTable === undefined
            ? {}
            : { lootTable }),
        };
      })
      .sort((a, b) =>
        a.stateId.localeCompare(b.stateId)
      );

  return {
    entityKey: entityKey(entity),
    states,
    configuredStates:
      states.filter(
        (state) => state.configured,
      ).length,
    lootTables: [
      ...new Set(
        states.flatMap(
          (state) =>
            state.lootTable === undefined
              ? []
              : [state.lootTable],
        ),
      ),
    ].sort(),
  };
}
