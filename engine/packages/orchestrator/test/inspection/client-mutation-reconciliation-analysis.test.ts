import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../../../../analyzers/scripts/src/index.js";
import { analyzeClientMutationReconciliation } from "../../src/inspection/client-mutation-reconciliation-analysis.js";

describe("client mutation reconciliation analysis", () => {
  it("detects cancelled predicted block interactions with liquid hints", () => {
    const text = [
      "world.beforeEvents.playerInteractWithBlock.subscribe((event) => {",
      "  const item = event.itemStack;",
      "  if (item?.typeId === 'minecraft:water_bucket') {",
      "    event.cancel = true;",
      "  }",
      "});",
    ].join("\n");
    const parsed = parseScriptFile(
      "main",
      text,
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeClientMutationReconciliation([
      { parsed, text },
    ]);

    expect(result.predictedMutationCancellations).toBe(1);
    expect(result.liquidOrWaterlogCancellations).toBe(1);
  });

  it("ignores after-event handlers because they cannot cancel the mutation", () => {
    const text = [
      "world.afterEvents.playerPlaceBlock.subscribe((event) => {",
      "  console.warn(event.block.typeId);",
      "});",
    ].join("\n");
    const parsed = parseScriptFile(
      "main",
      text,
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeClientMutationReconciliation([
      { parsed, text },
    ]);

    expect(result.predictedMutationCancellations).toBe(0);
  });
});
