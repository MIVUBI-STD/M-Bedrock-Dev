import { describe, expect, it } from "vitest";
import type { KnowledgeCatalog } from "../../knowledge/src/types.js";
import { parseMcFunction } from "../../../analyzers/functions/src/parse.js";
import { analyzeStructureAndChunkRuntime } from "../src/structure-runtime-analysis.js";
import { derivePlacementProofs } from "../src/structure-proof-analysis.js";
import {
  analyzeMutationTransactionOrdering,
  mutationTransactionRuntimeEvidence,
} from "../src/mutation-transaction-analysis.js";
import { analyzeKnowledgeRuntime } from "../src/knowledge-runtime-analysis.js";

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
    id: "policy",
    title: "Policy",
    url: "project://knowledge/mutation-order-test",
    authority: "project-policy",
    confidence: "designed",
    retrievedDate: "2026-09-24",
  }],
  facts: [],
  relations: [{
    id: "dependent-needs-verification",
    domain: "world-mutation",
    subject: "mutation-dependent-action",
    kind: "requires",
    object: "verification-before-dependent-action",
    classification: "project-policy",
    applicability: { editions: ["bedrock"] },
    sourceIds: ["policy"],
    diagnosticSeverity: "critical",
  }],
};

function analyze(functions: ReturnType<typeof parseMcFunction>[]) {
  const runtime = analyzeStructureAndChunkRuntime(functions, [structure]);
  const proofs = derivePlacementProofs(runtime, functions);
  return {
    proofs,
    transactions: analyzeMutationTransactionOrdering(functions, proofs),
  };
}

describe("mutation transaction ordering", () => {
  it("accepts verify-before-teleport within the structure bounds", () => {
    const fn = parseMcFunction(
      "demo:start",
      [
        "structure load demo:arena 0 64 0",
        "execute if block 1 64 1 minecraft:gold_block run tp @s 5 65 5",
      ].join("\n"),
      { artifactId: "a", relativePath: "functions/start.mcfunction" },
    );

    const { transactions } = analyze([fn]);
    expect(transactions.assessments).toEqual([
      expect.objectContaining({
        status: "verified-before-dependent",
      }),
    ]);

    const reasoning = analyzeKnowledgeRuntime(
      catalog,
      { edition: "bedrock" },
      [],
      [fn],
      mutationTransactionRuntimeEvidence(transactions.assessments),
    );
    expect(reasoning.violations).toBe(0);
    expect(reasoning.evidenceGaps).toBe(0);
  });

  it("marks teleport-before-known-verification as a critical ordering defect", () => {
    const fn = parseMcFunction(
      "demo:start",
      [
        "structure load demo:arena 0 64 0",
        "tp @s 5 65 5",
        "execute if block 1 64 1 minecraft:gold_block run function demo:done",
      ].join("\n"),
      { artifactId: "a", relativePath: "functions/start.mcfunction" },
    );

    const { transactions } = analyze([fn]);
    expect(transactions.assessments[0]?.status).toBe(
      "dependent-before-verification",
    );

    const reasoning = analyzeKnowledgeRuntime(
      catalog,
      { edition: "bedrock" },
      [],
      [fn],
      mutationTransactionRuntimeEvidence(transactions.assessments),
    );
    expect(reasoning.violations).toBe(1);
    expect(reasoning.diagnostics[0]?.severity).toBe("critical");
  });

  it("follows a direct function call and accepts a related verification there", () => {
    const root = parseMcFunction(
      "demo:start",
      [
        "structure load demo:arena 0 64 0",
        "function demo:verify",
      ].join("\n"),
      { artifactId: "a", relativePath: "functions/start.mcfunction" },
    );
    const child = parseMcFunction(
      "demo:verify",
      "execute if block 1 64 1 minecraft:gold_block run tp @s 5 65 5",
      { artifactId: "a", relativePath: "functions/verify.mcfunction" },
    );

    const { transactions } = analyze([root, child]);
    expect(transactions.assessments).toEqual([
      expect.objectContaining({
        rootFunctionId: "demo:start",
        status: "verified-before-dependent",
        verificationStep: expect.objectContaining({
          functionId: "demo:verify",
        }),
      }),
    ]);
  });

  it("treats summon as dependent work after a direct fill mutation", () => {
    const fn = parseMcFunction(
      "demo:spawn",
      [
        "fill 0 64 0 15 70 15 minecraft:stone",
        "execute if block 1 64 1 minecraft:stone run summon minecraft:zombie 5 65 5",
      ].join("\n"),
      { artifactId: "a", relativePath: "functions/spawn.mcfunction" },
    );

    const runtime = analyzeStructureAndChunkRuntime([fn], []);
    const proofs = derivePlacementProofs(runtime, [fn]);
    const transactions = analyzeMutationTransactionOrdering([fn], proofs);

    expect(transactions.assessments).toEqual([
      expect.objectContaining({
        status: "verified-before-dependent",
        dependentStep: expect.objectContaining({
          detail: "entity-spawn",
        }),
      }),
    ]);
  });

  it("flags summon before a later direct-mutation verification", () => {
    const fn = parseMcFunction(
      "demo:spawn",
      [
        "fill 0 64 0 15 70 15 minecraft:stone",
        "summon minecraft:zombie 5 65 5",
        "execute if block 1 64 1 minecraft:stone run function demo:done",
      ].join("\n"),
      { artifactId: "a", relativePath: "functions/spawn.mcfunction" },
    );

    const runtime = analyzeStructureAndChunkRuntime([fn], []);
    const proofs = derivePlacementProofs(runtime, [fn]);
    const transactions = analyzeMutationTransactionOrdering([fn], proofs);

    expect(transactions.assessments[0]?.status).toBe(
      "dependent-before-verification",
    );
  });

  it("keeps unrelated verification or unresolved calls as unknown", () => {
    const unrelated = parseMcFunction(
      "demo:unrelated",
      [
        "structure load demo:arena 0 64 0",
        "execute if block 100 64 100 minecraft:gold_block run tp @s 5 65 5",
      ].join("\n"),
      { artifactId: "a", relativePath: "functions/unrelated.mcfunction" },
    );
    const unresolved = parseMcFunction(
      "demo:unresolved",
      [
        "structure load demo:arena 0 64 0",
        "function demo:unknown_helper",
        "tp @s 5 65 5",
        "execute if block 1 64 1 minecraft:gold_block run function demo:done",
      ].join("\n"),
      { artifactId: "a", relativePath: "functions/unresolved.mcfunction" },
    );

    expect(analyze([unrelated]).transactions.assessments[0]?.status).toBe(
      "verification-unresolved",
    );
    expect(analyze([unresolved]).transactions.assessments[0]?.status).toBe(
      "verification-unresolved",
    );
  });
});
