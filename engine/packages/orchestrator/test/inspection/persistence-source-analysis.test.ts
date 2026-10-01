import { describe, expect, it } from "vitest";
import {
  parseScriptFile,
} from "../../../../analyzers/scripts/src/index.js";
import {
  analyzePersistenceSource,
} from "../../src/inspection/persistence-source-analysis.js";

describe("persistence source analysis", () => {
  it("summarizes growth without promoting it to a defect", () => {
    const script = parseScriptFile(
      "main",
      `
        const history = JSON.parse(
          world.getDynamicProperty("history") ?? "[]"
        );
        history.push("match");
        world.setDynamicProperty(
          "history",
          JSON.stringify(history),
        );
      `,
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzePersistenceSource([script]);

    expect(result.appendWithoutClear).toBe(1);
    expect(
      result.worldScopedAppendWithoutClear,
    ).toBe(1);
    expect(result.properties[0]).toMatchObject({
      propertyId: "history",
      scope: "world",
      lifetime: "world",
      growth: "append-without-clear",
    });
  });
});
