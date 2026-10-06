import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../../../../analyzers/scripts/src/index.js";
import { analyzeInteractiveBlockState } from "../../src/inspection/interactive-block-state-analysis.js";

describe("interactive block state analysis", () => {
  it("does not treat type-only mutation as permutation proof", () => {
    const script = parseScriptFile(
      "main",
      "dimension.setBlockType({ x: 1, y: 2, z: 3 }, 'minecraft:oak_door');",
      { artifactId: "fixture", relativePath: "scripts/main.ts" },
    );
    expect(analyzeInteractiveBlockState([script])).toMatchObject({
      typeOnlyWrites: 1,
      explicitPermutationWrites: 0,
    });
  });

  it("preserves authored permutation expression as state evidence", () => {
    const script = parseScriptFile(
      "main",
      "dimension.setBlockPermutation({ x: 1, y: 2, z: 3 }, doorPermutation);",
      { artifactId: "fixture", relativePath: "scripts/main.ts" },
    );
    const result = analyzeInteractiveBlockState([script]);
    expect(result.explicitPermutationWrites).toBe(1);
    expect(result.mutations[0]?.permutationExpression).toBe("doorPermutation");
  });
});
