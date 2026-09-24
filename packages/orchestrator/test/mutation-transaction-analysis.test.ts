import { describe, expect, it } from "vitest";
import type { KnowledgeCatalog } from "../../knowledge/src/types.js";
import { parseMcFunction } from "../../../analyzers/functions/src/index.js";
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

  it("flags a dependent action in a child function before a later sibling verification", () => {
    const root = parseMcFunction(
      "demo:root",
      [
        "structure load demo:arena 0 64 0",
        "function demo:start",
        "function demo:verify",
      ].join("\n"),
      { artifactId: "a", relativePath: "functions/root.mcfunction" },
    );
    const start = parseMcFunction(
      "demo:start",
      "tp @s 5 65 5",
      { artifactId: "a", relativePath: "functions/start.mcfunction" },
    );
    const verify = parseMcFunction(
      "demo:verify",
      "execute if block 1 64 1 minecraft:gold_block run function demo:done",
      { artifactId: "a", relativePath: "functions/verify.mcfunction" },
    );

    const { transactions } = analyze([root, start, verify]);
    expect(transactions.assessments[0]).toEqual(expect.objectContaining({
      rootFunctionId: "demo:root",
      status: "dependent-before-verification",
      dependentStep: expect.objectContaining({
        functionId: "demo:start",
      }),
      verificationStep: expect.objectContaining({
        functionId: "demo:verify",
      }),
    }));
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

  it("supports project-defined function handoff as a dependent action", () => {
    const fn = parseMcFunction(
      "demo:start",
      [
        "fill 0 64 0 15 70 15 minecraft:stone",
        "execute if block 1 64 1 minecraft:stone run function arena/start",
      ].join("\n"),
      { artifactId: "a", relativePath: "functions/start.mcfunction" },
    );

    const runtime = analyzeStructureAndChunkRuntime([fn], []);
    const proofs = derivePlacementProofs(runtime, [fn]);
    const result = analyzeMutationTransactionOrdering(
      [fn],
      proofs,
      [{
        id: "arena-start",
        kind: "function-call",
        functionTarget: "arena/start",
        purpose: "arena gameplay start",
      }],
    );

    expect(result.assessments).toEqual([
      expect.objectContaining({
        status: "verified-before-dependent",
        dependentStep: expect.objectContaining({
          detail: "arena gameplay start",
        }),
      }),
    ]);
  });

  it("detects project-defined scoreboard activation before later verification", () => {
    const fn = parseMcFunction(
      "demo:start",
      [
        "fill 0 64 0 15 70 15 minecraft:stone",
        "scoreboard players set #arena phase 1",
        "execute if block 1 64 1 minecraft:stone run function demo:done",
      ].join("\n"),
      { artifactId: "a", relativePath: "functions/start.mcfunction" },
    );

    const runtime = analyzeStructureAndChunkRuntime([fn], []);
    const proofs = derivePlacementProofs(runtime, [fn]);
    const result = analyzeMutationTransactionOrdering(
      [fn],
      proofs,
      [{
        id: "phase-activation",
        kind: "scoreboard-write",
        objective: "phase",
      }],
    );

    expect(result.assessments[0]).toEqual(expect.objectContaining({
      status: "dependent-before-verification",
      dependentStep: expect.objectContaining({
        detail: "phase-activation",
      }),
    }));
  });

  it("surfaces bounded inline depth as unresolved instead of no-dependent-action", () => {
    const root = parseMcFunction(
      "demo:root",
      [
        "structure load demo:arena 0 64 0",
        "function demo:a",
      ].join("\n"),
      { artifactId: "a", relativePath: "functions/root.mcfunction" },
    );
    const a = parseMcFunction(
      "demo:a",
      "function demo:b",
      { artifactId: "a", relativePath: "functions/a.mcfunction" },
    );
    const b = parseMcFunction(
      "demo:b",
      "function demo:c",
      { artifactId: "a", relativePath: "functions/b.mcfunction" },
    );
    const cFn = parseMcFunction(
      "demo:c",
      "tp @s 5 65 5",
      { artifactId: "a", relativePath: "functions/c.mcfunction" },
    );

    const runtime = analyzeStructureAndChunkRuntime(
      [root, a, b, cFn],
      [structure],
    );
    const proofs = derivePlacementProofs(
      runtime,
      [root, a, b, cFn],
    );
    const result = analyzeMutationTransactionOrdering(
      [root, a, b, cFn],
      proofs,
      [],
      1,
    );

    expect(result.assessments[0]?.status).toBe("verification-unresolved");
    expect(result.assessments[0]?.barriers).toEqual([
      expect.objectContaining({
        kind: "depth-limit",
      }),
    ]);
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
