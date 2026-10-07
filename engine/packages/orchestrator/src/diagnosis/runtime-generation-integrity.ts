import type {
  RuntimeProbeExchange,
  RuntimeScope,
} from "../../../project-model/src/index.js";

const GENERATION_KEYS = [
  "arenaGeneration",
  "connectionGeneration",
  "lifeGeneration",
  "participationGeneration",
  "entityGeneration",
  "subsystemGeneration",
  "bootGeneration",
] as const;

export interface RuntimeGenerationIntegrity {
  status: "CURRENT" | "STALE" | "UNSCOPED";
  staleKeys: readonly (typeof GENERATION_KEYS)[number][];
}

export function assessRuntimeGenerationIntegrity(
  exchange: RuntimeProbeExchange,
  expectedScope: RuntimeScope | undefined,
): RuntimeGenerationIntegrity {
  if (!expectedScope) {
    return { status: "UNSCOPED", staleKeys: [] };
  }
  const actual = exchange.response.evidence.scope;
  if (!actual) {
    return { status: "UNSCOPED", staleKeys: [] };
  }
  const staleKeys = GENERATION_KEYS.filter((key) =>
    expectedScope[key] !== undefined &&
    actual[key] !== expectedScope[key]
  );
  return {
    status: staleKeys.length === 0 ? "CURRENT" : "STALE",
    staleKeys,
  };
}
