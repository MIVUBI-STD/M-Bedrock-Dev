import { describe, expect, it } from "vitest";
import type { KnowledgeCatalog } from "../../knowledge/src/types.js";
import { parseScriptFile } from "../../../analyzers/scripts/src/parse.js";
import {
  analyzeScriptMutationTransactions,
  scriptMutationTransactionRuntimeEvidence,
} from "../src/script-mutation-transaction-analysis.js";
import { analyzeKnowledgeRuntime } from "../src/knowledge-runtime-analysis.js";

const source = { artifactId: "a", relativePath: "scripts/main.ts" };

const catalog: KnowledgeCatalog = {
  schemaVersion: 1,
  sources: [{
    id: "policy",
    title: "Policy",
    url: "project://knowledge/script-mutation-test",
    authority: "project-policy",
    confidence: "designed",
    retrievedDate: "2026-09-24",
  }],
  facts: [],
  relations: [{
    id: "script-candidate-needs-verification",
    domain: "world-mutation",
    subject: "script-mutation-dependent-action-candidate",
    kind: "requires",
    object: "script-verification-before-dependent-action",
    classification: "project-policy",
    applicability: { editions: ["bedrock"] },
    sourceIds: ["policy"],
  }],
};

function parse(body: string) {
  return parseScriptFile("scripts/main", body, source);
}

describe("script mutation transaction analysis", () => {
  it("proves verification before teleport on the same block receiver", () => {
    const script = parse(`
      import { world } from "@minecraft/server";
      const dimension = world.getDimension("overworld");
      const block = dimension.getBlock({ x: 0, y: 64, z: 0 });
      const player = world.getAllPlayers()[0];
      block.setType("minecraft:stone");
      if (block.matches("minecraft:stone")) {
        player.teleport({ x: 1, y: 65, z: 1 });
      }
    `);

    const calls = script.methodCalls;
    expect(calls).toEqual(expect.arrayContaining([
      expect.objectContaining({
        receiverType: "Block",
        method: "setType",
        receiverHint: "block",
        executionRegion: "module",
      }),
      expect.objectContaining({
        receiverType: "Block",
        method: "matches",
        receiverHint: "block",
        resultUse: "guard-condition",
      }),
      expect.objectContaining({
        receiverType: "Player",
        method: "teleport",
      }),
    ]));

    const assessments = analyzeScriptMutationTransactions([script]);
    expect(assessments).toEqual([
      expect.objectContaining({
        status: "verified-before-dependent",
        receiver: "block",
      }),
    ]);

    const reasoning = analyzeKnowledgeRuntime(
      catalog,
      { edition: "bedrock" },
      [],
      [],
      scriptMutationTransactionRuntimeEvidence(assessments),
      [script],
    );
    expect(reasoning.evidenceGaps).toBe(0);
    expect(reasoning.violations).toBe(0);
  });

  it("keeps teleport before a later same-block guard as an informational evidence gap", () => {
    const script = parse(`
      import { world } from "@minecraft/server";
      const dimension = world.getDimension("overworld");
      const block = dimension.getBlock({ x: 0, y: 64, z: 0 });
      const player = world.getAllPlayers()[0];
      block.setType("minecraft:stone");
      player.teleport({ x: 1, y: 65, z: 1 });
      if (block.matches("minecraft:stone")) {
        player.addTag("ready");
      }
    `);

    const assessments = analyzeScriptMutationTransactions([script]);
    expect(assessments[0]?.status).toBe("late-verification-candidate");

    const reasoning = analyzeKnowledgeRuntime(
      catalog,
      { edition: "bedrock" },
      [],
      [],
      scriptMutationTransactionRuntimeEvidence(assessments),
      [script],
    );
    expect(reasoning.violations).toBe(0);
    expect(reasoning.evidenceGaps).toBe(1);
    expect(reasoning.diagnostics[0]?.severity).toBe("info");
  });

  it("does not accept a guard on a different block receiver", () => {
    const script = parse(`
      import { world } from "@minecraft/server";
      const dimension = world.getDimension("overworld");
      const blockA = dimension.getBlock({ x: 0, y: 64, z: 0 });
      const blockB = dimension.getBlock({ x: 10, y: 64, z: 10 });
      const player = world.getAllPlayers()[0];
      blockA.setType("minecraft:stone");
      if (blockB.matches("minecraft:stone")) {
        player.teleport({ x: 1, y: 65, z: 1 });
      }
    `);

    expect(analyzeScriptMutationTransactions([script])[0]?.status).toBe(
      "verification-unresolved",
    );
  });

  it("does not merge independent lexical execution regions", () => {
    const script = parse(`
      import { world } from "@minecraft/server";
      const dimension = world.getDimension("overworld");
      const block = dimension.getBlock({ x: 0, y: 64, z: 0 });
      const player = world.getAllPlayers()[0];

      function mutate() {
        block.setType("minecraft:stone");
      }

      function move() {
        if (block.matches("minecraft:stone")) {
          player.teleport({ x: 1, y: 65, z: 1 });
        }
      }
    `);

    const assessments = analyzeScriptMutationTransactions([script]);
    expect(assessments).toEqual([
      expect.objectContaining({
        executionRegion: "function:mutate",
        status: "no-dependent-action",
      }),
    ]);
  });
});
