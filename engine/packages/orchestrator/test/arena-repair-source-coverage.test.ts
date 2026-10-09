import { describe, expect, it } from "vitest";
import {
  BUILTIN_REPAIR_STRATEGY_SOURCES,
  validateRepairStrategySourceRegistry,
} from "../src/repair/repair-strategy-source-registry.js";

describe("arena repair source coverage", () => {
  it("routes physical arena divergence as proposal-only", () => {
    const source =
      BUILTIN_REPAIR_STRATEGY_SOURCES.sources.find(
        (item) =>
          item.id === "arena-replica-remediation",
      );
    expect(source?.selectionMode).toBe("proposal-only");
    expect(source?.deterministic).toBe(false);
    expect(source?.supportedDiagnosticCodes).toEqual(
      expect.arrayContaining([
        "ARENA_VOXEL_DIVERGENCE",
        "ARENA_BLOCK_ENTITY_DIVERGENCE",
        "ARENA_ENTITY_POPULATION_DIVERGENCE",
        "ARENA_TICK_STATE_DIVERGENCE",
        "ARENA_STRUCTURE_INSTANCE_DIVERGENCE",
      ]),
    );
  });

  it("keeps built-in registry valid", () => {
    expect(
      validateRepairStrategySourceRegistry(
        BUILTIN_REPAIR_STRATEGY_SOURCES,
      ),
    ).toEqual([]);
  });
});
