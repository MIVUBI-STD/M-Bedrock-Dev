import { describe, expect, it } from "vitest";
import {
  requiredKnowledgeDomainsForPreset,
} from "../../src/inspection/gameplay-scenario-knowledge.js";
import type {
  GameplayWorldModel,
} from "../../src/inspection/gameplay-world-model.js";

function world(): GameplayWorldModel {
  return {
    arenas: {
      detected: true,
    },
    inventory: {
      regions: 1,
      grantRegions: 1,
      dropRegions: 0,
    },
    economy: {
      sourceKinds: ["script-inventory-grant"],
    },
    persistence: {
      properties: 2,
    },
    chunks: {
      tickingAreaAcquires: 1,
      tickingAreaReadinessStates: 0,
      readinessProbes: 0,
      entityResidencyObservability: "partial",
    },
    entities: {
      definitions: 4,
    },
    combat: {
      hurtHandlers: 0,
      deathHandlers: 0,
      damageApplications: 0,
    },
    structures: {
      definitions: 0,
      loads: 0,
      runtimeLogicLoads: 0,
    },
    spatial: {
      resolvedScriptEffects: 0,
      structurePlacements: 0,
      authority: {
        configured: false,
      },
    },
    platformKnowledge: {
      profileResolved: true,
    },
  } as unknown as GameplayWorldModel;
}

describe("conditional gameplay knowledge dependencies", () => {
  it("expands reconnect inventory proof into persistence, arena, and temporal ownership when those surfaces coexist", () => {
    const domains =
      requiredKnowledgeDomainsForPreset(
        "disconnect-reconnect",
        world(),
      );

    expect(domains).toEqual(
      expect.arrayContaining([
        "inventory-state",
        "persistence-recovery",
        "arena-lifecycle",
        "multiplayer-interleaving",
        "temporal-ownership",
        "chunk-simulation",
        "platform-constraints",
        "entity-behavior",
      ]),
    );
  });

  it("keeps chunk-simulation mandatory for simulation-distance even when no ticking mechanism exists", () => {
    const input = world();
    const noChunkMechanism = {
      ...input,
      chunks: {
        ...input.chunks,
        tickingAreaAcquires: 0,
        tickingAreaReadinessStates: 0,
        readinessProbes: 0,
        entityResidencyObservability: "absent",
      },
    } as GameplayWorldModel;

    const domains =
      requiredKnowledgeDomainsForPreset(
        "simulation-distance",
        noChunkMechanism,
      );

    expect(domains).toContain(
      "chunk-simulation",
    );
    expect(domains).toContain(
      "platform-constraints",
    );
  });

  it("routes transaction atomicity into inventory/economy/temporal proof instead of state-flow only", () => {
    const domains =
      requiredKnowledgeDomainsForPreset(
        "transaction-atomicity",
        world(),
      );

    expect(domains).toEqual(
      expect.arrayContaining([
        "inventory-state",
        "economy-reward",
        "temporal-ownership",
      ]),
    );
  });

  it("does not require economy knowledge when no economy surface exists", () => {
    const input = world();
    const withoutEconomy = {
      ...input,
      economy: {
        ...input.economy,
        sourceKinds: [],
      },
    } as GameplayWorldModel;

    const domains =
      requiredKnowledgeDomainsForPreset(
        "disconnect-reconnect",
        withoutEconomy,
      );

    expect(domains).not.toContain(
      "economy-reward",
    );
  });
});
