export const RUNTIME_SEMANTIC_ATTRIBUTES = {
  mapId: "map.id",
  arenaId: "arena.id",
  arenaGeneration: "arena.generation",
  playerId: "player.id",
  connectionGeneration: "connection.generation",
  participationGeneration: "participation.generation",
  lifeGeneration: "life.generation",
  entityId: "entity.id",
  entityGeneration: "entity.generation",
  operationId: "operation.id",
  bootGeneration: "boot.generation",
  runtimeProfile: "runtime.profile",
  experimentId: "experiment.id",
  scenarioId: "scenario.id",
  eventSequence: "event.sequence",
  eventTick: "event.tick",
} as const;

export type RuntimeSemanticAttributeKey = typeof RUNTIME_SEMANTIC_ATTRIBUTES[keyof typeof RUNTIME_SEMANTIC_ATTRIBUTES];
export type RuntimeSemanticAttributeValue = string | number | boolean;

export interface RuntimeSemanticAttributeDefinition {
  key: RuntimeSemanticAttributeKey;
  valueType: "string" | "integer";
  role: "identity" | "generation" | "profile" | "execution-order";
  description: string;
}

export const RUNTIME_SEMANTIC_ATTRIBUTE_DEFINITIONS: readonly RuntimeSemanticAttributeDefinition[] = [
  { key: "map.id", valueType: "string", role: "identity", description: "Stable target map/artifact identity." },
  { key: "arena.id", valueType: "string", role: "identity", description: "Logical arena/session partition identity." },
  { key: "arena.generation", valueType: "integer", role: "generation", description: "Arena lifecycle generation." },
  { key: "player.id", valueType: "string", role: "identity", description: "Runtime player identity used by the evidence source." },
  { key: "connection.generation", valueType: "integer", role: "generation", description: "Connection lifecycle generation." },
  { key: "participation.generation", valueType: "integer", role: "generation", description: "Arena participation generation." },
  { key: "life.generation", valueType: "integer", role: "generation", description: "Player/entity life generation." },
  { key: "entity.id", valueType: "string", role: "identity", description: "Runtime entity identity." },
  { key: "entity.generation", valueType: "integer", role: "generation", description: "Entity replacement/lifecycle generation." },
  { key: "operation.id", valueType: "string", role: "identity", description: "Logical operation/transaction identity." },
  { key: "boot.generation", valueType: "integer", role: "generation", description: "Runtime boot/reload generation." },
  { key: "runtime.profile", valueType: "string", role: "profile", description: "Captured runtime profile fingerprint." },
  { key: "experiment.id", valueType: "string", role: "identity", description: "Controlled experiment identity." },
  { key: "scenario.id", valueType: "string", role: "identity", description: "Runtime scenario identity." },
  { key: "event.sequence", valueType: "integer", role: "execution-order", description: "Monotonic sequence inside one evidence stream." },
  { key: "event.tick", valueType: "integer", role: "execution-order", description: "Observed Minecraft/server tick when available." },
];

const definitionByKey = new Map(RUNTIME_SEMANTIC_ATTRIBUTE_DEFINITIONS.map((item) => [item.key, item]));

export function validateRuntimeSemanticAttributes(
  attributes: Readonly<Record<string, RuntimeSemanticAttributeValue>>,
  strict = false,
): string[] {
  const errors: string[] = [];
  for (const [key, value] of Object.entries(attributes)) {
    const definition = definitionByKey.get(key as RuntimeSemanticAttributeKey);
    if (!definition) {
      if (strict) errors.push("Unknown runtime semantic attribute: " + key);
      continue;
    }
    if (definition.valueType === "string" && (typeof value !== "string" || !value.trim())) {
      errors.push(key + " must be a non-empty string.");
    }
    if (definition.valueType === "integer" && (typeof value !== "number" || !Number.isInteger(value))) {
      errors.push(key + " must be an integer.");
    }
  }
  return errors;
}
