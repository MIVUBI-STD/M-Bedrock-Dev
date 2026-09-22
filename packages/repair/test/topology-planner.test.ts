import { describe, expect, it } from "vitest";
import { analyzeCommand } from "../../../analyzers/commands/src/parse.js";
import { planLinearTopologyRepair } from "../src/topology-planner.js";

const source = {
  artifactId: "fixture",
  relativePath: "functions/arena.mcfunction",
  range: { lineStart: 3, lineEnd: 3 },
};

describe("linear topology repair planner", () => {
  it("plans a fill translation while preserving region shape", () => {
    const effect = analyzeCommand(
      "fill 198 0 0 201 2 3 stone",
      source,
    ).effects.find((item) => item.kind === "fill");

    if (!effect) throw new Error("expected fill effect");

    const result = planLinearTopologyRepair({
      effect,
      rawCommand: "fill 198 0 0 201 2 3 stone",
      outlier: {
        effectIndex: 2,
        axis: "x",
        expectedCoordinate: 200,
        actualCoordinate: 198,
        step: 100,
        sourcePath: source.relativePath,
      },
    }, "source-sha");

    expect(result.status).toBe("planned");
    if (result.status !== "planned") return;

    expect(result.transaction.operations[0]).toMatchObject({
      expected: "fill 198 0 0 201 2 3 stone",
      replacement: "fill 200 0 0 203 2 3 stone",
    });
    expect(result.transaction.affectedPaths).toEqual(["functions/arena.mcfunction"]);
  });

  it("rejects relative-coordinate repair", () => {
    const effect = analyzeCommand(
      "fill ~198 ~ ~ ~201 ~2 ~3 stone",
      source,
    ).effects.find((item) => item.kind === "fill");

    if (!effect) throw new Error("expected fill effect");

    const result = planLinearTopologyRepair({
      effect,
      rawCommand: "fill ~198 ~ ~ ~201 ~2 ~3 stone",
      outlier: {
        effectIndex: 0,
        axis: "x",
        expectedCoordinate: 200,
        actualCoordinate: 198,
        step: 100,
        sourcePath: source.relativePath,
      },
    }, "source-sha");

    expect(result.status).toBe("unsupported");
  });
});
