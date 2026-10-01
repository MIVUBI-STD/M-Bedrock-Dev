import { describe, expect, it } from "vitest";
import {
  BEDROCK_RUNTIME_ACTION_CAPABILITY_REGISTRY,
  compareRequiredRuntimeActions,
  createAllArenaFinishStressExperiment,
  requiredBedrockActionCapabilities,
  validateRuntimeActionCapabilityRegistry,
} from "../../src/index.js";

describe("canonical bedrock runtime action registry", () => {
  it("merges all runtime action families without conflicting ids", () => {
    expect(
      validateRuntimeActionCapabilityRegistry(
        BEDROCK_RUNTIME_ACTION_CAPABILITY_REGISTRY,
      ),
    ).toEqual([]);
    expect(
      BEDROCK_RUNTIME_ACTION_CAPABILITY_REGISTRY
        .actions.length,
    ).toBeGreaterThan(10);
  });

  it("derives only actions required by one experiment", () => {
    const definition =
      createAllArenaFinishStressExperiment({
        id: "finish",
        title: "finish",
        targetProfileFingerprint: "target",
        fixtureFingerprint: "fixture",
        objectiveId: "qa",
        participant: "result",
        arenas: [
          {
            arenaId: "arena-1",
            arenaGeneration: 1,
          },
          {
            arenaId: "arena-2",
            arenaGeneration: 1,
          },
        ],
        playerCountPerArena: 5,
      });

    const required =
      requiredBedrockActionCapabilities(
        definition,
      );

    expect(
      required.actions.map(
        (item) => item.id,
      ),
    ).toEqual([
      "multiplayer.cleanup-arena-stress-fixture",
      "multiplayer.execute-all-arena-finish-burst",
      "multiplayer.reset-arena-stress-fixture",
    ]);
  });

  it("accepts an announced superset when all required signatures match", () => {
    const required = {
      schemaVersion: 1 as const,
      actions:
        BEDROCK_RUNTIME_ACTION_CAPABILITY_REGISTRY
          .actions.slice(0, 1),
    };

    expect(
      compareRequiredRuntimeActions(
        required,
        BEDROCK_RUNTIME_ACTION_CAPABILITY_REGISTRY,
      ),
    ).toEqual([]);
  });
});
