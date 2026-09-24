import { describe, expect, it } from "vitest";
import type { KnowledgeCatalog } from "../../knowledge/src/types.js";
import { parseMcFunction } from "../../../analyzers/functions/src/index.js";
import { analyzeStructureAndChunkRuntime } from "../src/structure-runtime-analysis.js";
import { structureRuntimeEvidence } from "../src/structure-runtime-evidence.js";
import { analyzeKnowledgeRuntime } from "../src/knowledge-runtime-analysis.js";

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
  }],
};

const semantics = {
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
};

function fixture() {
  return parseMcFunction(
    "demo/start",
    "structure load demo:arena 0 64 0",
    { artifactId: "fixture", relativePath: "functions/start.mcfunction" },
  );
}

describe("structure runtime evidence", () => {
  it("satisfies resolved structure target evidence in the same operation scope", () => {
    const fn = fixture();
    const analysis = analyzeStructureAndChunkRuntime([fn], [{
      identifier: "demo:arena",
      relativePath: "structures/demo/arena.mcstructure",
      semantics,
    }]);
    const evidence = structureRuntimeEvidence(
      analysis,
      new Map([[fn.identifier, fn.source]]),
    );
    const result = analyzeKnowledgeRuntime(
      catalog,
      { edition: "bedrock" },
      [],
      [fn],
      evidence,
    );

    expect(result.violations).toBe(0);
    expect(result.evidenceGaps).toBe(0);
  });

  it("turns a missing structure target into an explicit knowledge violation", () => {
    const fn = fixture();
    const analysis = analyzeStructureAndChunkRuntime([fn], []);
    const evidence = structureRuntimeEvidence(
      analysis,
      new Map([[fn.identifier, fn.source]]),
    );
    const result = analyzeKnowledgeRuntime(
      catalog,
      { edition: "bedrock" },
      [],
      [fn],
      evidence,
    );

    expect(result.violations).toBe(1);
    expect(result.diagnostics[0]?.code).toBe("KNOWLEDGE_RELATION_VIOLATION");
    expect(result.diagnostics[0]?.source?.range?.lineStart).toBe(1);
  });
});