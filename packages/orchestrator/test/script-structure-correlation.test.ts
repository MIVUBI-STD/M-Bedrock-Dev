import { describe, expect, it } from "vitest";
import type { KnowledgeCatalog } from "../../knowledge/src/types.js";
import { parseScriptFile } from "../../../analyzers/scripts/src/parse.js";
import {
  correlateScriptStructureLoads,
  scriptStructureRuntimeEvidence,
} from "../src/script-structure-correlation.js";
import { analyzeKnowledgeRuntime } from "../src/knowledge-runtime-analysis.js";

const source = { artifactId: "a", relativePath: "scripts/main.ts" };

const structure = {
  identifier: "demo:arena",
  relativePath: "structures/demo/arena.mcstructure",
  size: { x: 16, y: 8, z: 16 },
  semantics: {
    entityCount: 0,
    hasEntities: false,
    paletteSize: 1,
    hasBlockPositionData: false,
    commandBlockPaletteEntries: 0,
    containerPaletteEntries: 0,
    embeddedCommandBlocks: 0,
    queuedTickPositions: 0,
    educationAllowEntries: 0,
    educationDenyEntries: 0,
    educationBorderEntries: 0,
  },
};

const catalog: KnowledgeCatalog = {
  schemaVersion: 1,
  sources: [{
    id: "official",
    title: "Official",
    url: "https://learn.microsoft.com/example",
    authority: "official",
    confidence: "documented",
    retrievedDate: "2026-09-24",
  }],
  facts: [],
  relations: [{
    id: "placement-needs-target",
    domain: "world-mutation",
    subject: "structure-placement-request",
    kind: "requires",
    object: "structure-target-resolved",
    classification: "derived-rule",
    applicability: { editions: ["bedrock"] },
    sourceIds: ["official"],
    diagnosticSeverity: "critical",
  }],
};

function script() {
  return parseScriptFile(
    "scripts/main",
    `
      import { world } from "@minecraft/server";
      const dimension = world.getDimension("overworld");
      dimension.runCommand("structure load demo:arena 0 64 0");
    `,
    source,
  );
}

describe("script structure load correlation", () => {
  it("satisfies structure target resolution when inventory contains one exact match", () => {
    const parsed = script();
    const correlations = correlateScriptStructureLoads(
      [parsed],
      [structure],
    );
    expect(correlations).toEqual([
      expect.objectContaining({
        target: "demo:arena",
        status: "resolved",
      }),
    ]);

    const result = analyzeKnowledgeRuntime(
      catalog,
      { edition: "bedrock" },
      [],
      [],
      scriptStructureRuntimeEvidence(correlations),
      [parsed],
    );

    expect(result.violations).toBe(0);
    expect(result.evidenceGaps).toBe(0);
  });

  it("turns a definitely missing Script structure target into a critical violation", () => {
    const parsed = script();
    const correlations = correlateScriptStructureLoads([parsed], []);
    expect(correlations[0]?.status).toBe("missing");

    const result = analyzeKnowledgeRuntime(
      catalog,
      { edition: "bedrock" },
      [],
      [],
      scriptStructureRuntimeEvidence(correlations),
      [parsed],
    );

    expect(result.violations).toBe(1);
    expect(result.diagnostics[0]?.severity).toBe("critical");
    expect(result.diagnostics[0]?.source?.relativePath).toBe("scripts/main.ts");
  });
});
