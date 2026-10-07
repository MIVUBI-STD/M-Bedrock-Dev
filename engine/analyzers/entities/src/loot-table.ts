export interface LootTablePoolEvidence {
  index: number;
  entryCount: number;
  conditionCount: number;
}

export interface LootTableStructureEvidence {
  poolCount: number;
  pools: readonly LootTablePoolEvidence[];
  conditional: boolean;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

export function analyzeLootTableStructure(
  raw: unknown,
): LootTableStructureEvidence {
  const root = asRecord(raw) ?? {};
  const pools = Array.isArray(root.pools) ? root.pools : [];
  const evidence = pools.map((value, index) => {
    const pool = asRecord(value) ?? {};
    return {
      index,
      entryCount: Array.isArray(pool.entries) ? pool.entries.length : 0,
      conditionCount: Array.isArray(pool.conditions) ? pool.conditions.length : 0,
    };
  });
  return {
    poolCount: evidence.length,
    pools: evidence,
    conditional: evidence.some((pool) => pool.conditionCount > 0),
  };
}
