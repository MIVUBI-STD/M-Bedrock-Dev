import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../../../../analyzers/scripts/src/index.js";
import { analyzeScriptPerformanceSurfaces } from "../../src/inspection/script-performance-analysis.js";

describe("script performance analysis", () => {
  it("inventories recurring scheduler and entity query surfaces without inventing cost", () => {
    const script = parseScriptFile(
      "main",
      [
        "system.runInterval(() => { dimension.getEntities(); }, 1);",
        "system.runJob(work());",
      ].join("\n"),
      { artifactId: "fixture", relativePath: "scripts/main.ts" },
    );
    expect(analyzeScriptPerformanceSurfaces([script])).toMatchObject({
      runIntervalCalls: 1,
      getEntitiesCalls: 1,
      runJobCalls: 1,
      runtimeMeasurementRequired: true,
    });
  });
});
