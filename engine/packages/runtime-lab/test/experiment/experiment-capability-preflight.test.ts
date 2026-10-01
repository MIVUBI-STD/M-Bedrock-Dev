import { describe, expect, it } from "vitest";
import {
  CHUNK_READINESS_CAPABILITY_REGISTRY,
  createTickingAreaChunkRecoveryExperiment,
  preflightRuntimeExperimentCapabilities,
  type RuntimeActionCapabilityRegistry,
} from "../../src/index.js";

const definition =
  createTickingAreaChunkRecoveryExperiment({
    id: "exp:chunk-recovery",
    title: "Chunk recovery",
    targetProfileFingerprint: "profile-a",
    fixtureFingerprint: "fixture-a",
    target: {
      dimension: "minecraft:overworld",
      x: 128,
      y: 64,
      z: 128,
    },
  });

describe("runtime experiment capability preflight", () => {
  it("accepts the chunk recovery experiment when all required actions are announced", () => {
    const result = preflightRuntimeExperimentCapabilities(
      definition,
      CHUNK_READINESS_CAPABILITY_REGISTRY,
      "LIVE_MINECRAFT",
    );

    expect(result.ready).toBe(true);
    expect(result.requiredActionIds).toEqual([
      "chunk.clear-temporary-ticking-area",
      "chunk.isolate-target-from-loaders",
      "chunk.set-temporary-ticking-area",
    ]);
    expect(result.missingActionIds).toEqual([]);
    expect(result.validationErrors).toEqual([]);
  });

  it("fails closed before execution when a required chunk action is missing", () => {
    const incomplete: RuntimeActionCapabilityRegistry = {
      schemaVersion: 1,
      actions:
        CHUNK_READINESS_CAPABILITY_REGISTRY.actions.filter(
          (action) =>
            action.id !==
              "chunk.set-temporary-ticking-area",
        ),
    };

    const result = preflightRuntimeExperimentCapabilities(
      definition,
      incomplete,
      "LIVE_MINECRAFT",
    );

    expect(result.ready).toBe(false);
    expect(result.missingActionIds).toEqual([
      "chunk.set-temporary-ticking-area",
    ]);
    expect(result.reasons.join(" ")).toMatch(
      /Missing runtime experiment actions/,
    );
  });

  it("detects context mismatch before the experiment reaches the host", () => {
    const result = preflightRuntimeExperimentCapabilities(
      definition,
      CHUNK_READINESS_CAPABILITY_REGISTRY,
      "LOCAL_MINECRAFT",
    );

    expect(result.ready).toBe(false);
    expect(result.validationErrors.join(" ")).toMatch(
      /requires LIVE_MINECRAFT/,
    );
  });
});
