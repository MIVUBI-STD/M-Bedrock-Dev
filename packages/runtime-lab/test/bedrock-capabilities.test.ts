import { describe, expect, it } from "vitest";
import {
  compareRuntimeActionRegistries,
  parseBedrockCapabilityAnnouncement,
  type RuntimeActionCapabilityRegistry,
} from "../src/index.js";

const registry: RuntimeActionCapabilityRegistry = {
  schemaVersion: 1,
  actions: [{
    id: "test.join-arena",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      arenaId: "string",
    },
  }],
};

describe("bedrock capability handshake", () => {
  it("parses a self-described runtime capability registry", () => {
    const announcement =
      parseBedrockCapabilityAnnouncement(
        JSON.stringify({
          schemaVersion: 1,
          requestId: "cap-1",
          runtimeTick: 42,
          registry,
        }),
      );

    expect(announcement.registry).toEqual(
      registry,
    );
  });

  it("detects drift between expected and runtime-announced capabilities", () => {
    const drifted: RuntimeActionCapabilityRegistry = {
      schemaVersion: 1,
      actions: [{
        ...registry.actions[0]!,
        mutationRisk: "mutating",
      }],
    };

    expect(
      compareRuntimeActionRegistries(
        registry,
        drifted,
      ).join(" "),
    ).toMatch(/do not match/);
  });
});
