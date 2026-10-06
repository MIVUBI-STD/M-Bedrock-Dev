import { describe, expect, it } from "vitest";
import {
  deriveScriptProgressionActiveEventEvidence,
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
});
