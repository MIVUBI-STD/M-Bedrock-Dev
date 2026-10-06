import { describe, expect, it } from "vitest";
import {
  deriveScriptProgressionActiveCallEvidence,
  deriveScriptProgressionActiveEventEvidence,
  deriveScriptProgressionActiveTransitionEvidence,
} from "../../../src/domains/progression/progression-counter-evidence.js";

const source = {
  artifactId: "fixture",
  relativePath: "scripts/main.ts",
};

describe("progression active event evidence", () => {
  it("captures event activation only under a direct active state guard", () => {
    const result =
      deriveScriptProgressionActiveEventEvidence(
        [
          "function tick(entity, waveState) {",
          "  if (waveState === 'active') {",
          "    entity.triggerEvent('demo:despawn');",
          "  }",
          "  if (waveState === 'waiting') {",
          "    entity.triggerEvent('demo:other');",
          "  }",
          "}",
        ].join("\n"),
        source,
      );

    expect(result).toEqual([
      expect.objectContaining({
        event: "demo:despawn",
        executionRegion: "function:tick",
      }),
    ]);
  });
  it("captures helper calls made under a direct active state guard", () => {
    const result =
      deriveScriptProgressionActiveCallEvidence(
        [
          "function tick(entity, waveState) {",
          "  if (waveState === 'active') {",
          "    maybeDespawn(entity);",
          "  }",
          "}",
          "function maybeDespawn(entity) {}",
        ].join("\n"),
        source,
      );

    expect(result).toEqual([
      expect.objectContaining({
        callerRegion: "function:tick",
        targetName: "maybeDespawn",
      }),
    ]);
  });

  it("captures calls and events after a direct active-state transition in the same block", () => {
    const result =
      deriveScriptProgressionActiveTransitionEvidence(
        [
          "function startWave(entity) {",
          "  waveState = 'active';",
          "  updateWave(entity);",
          "  entity.triggerEvent('demo:despawn');",
          "}",
          "function updateWave(entity) {}",
        ].join("\n"),
        source,
      );

    expect(result.calls).toEqual([
      expect.objectContaining({
        callerRegion:
          "function:startWave",
        targetName: "updateWave",
        basis: "transition",
      }),
    ]);
    expect(result.events).toEqual([
      expect.objectContaining({
        executionRegion:
          "function:startWave",
        event: "demo:despawn",
        basis: "transition",
      }),
    ]);
  });

  it("stops transition ownership after a direct non-active state replacement", () => {
    const result =
      deriveScriptProgressionActiveTransitionEvidence(
        [
          "function startWave(entity) {",
          "  waveState = 'active';",
          "  waveState = 'waiting';",
          "  maybeDespawn(entity);",
          "}",
          "function maybeDespawn(entity) {}",
        ].join("\n"),
        source,
      );

    expect(result.calls).toEqual([]);
    expect(result.events).toEqual([]);
  });

});
