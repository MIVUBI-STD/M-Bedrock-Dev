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

  it("treats Dimension.spawnEntity as dependent work gated by the same block verification", () => {
    const script = parse(`
      import { world } from "@minecraft/server";
      const dimension = world.getDimension("overworld");
      const block = dimension.getBlock({ x: 0, y: 64, z: 0 });

      block.setType("minecraft:stone");
      if (block.matches("minecraft:stone")) {
        dimension.spawnEntity("minecraft:zombie", { x: 5, y: 65, z: 5 });
      }
    `);

    const assessment = analyzeScriptMutationTransactions([script])[0];
    expect(assessment).toEqual(expect.objectContaining({
      status: "verified-before-dependent",
      dependentCall: expect.objectContaining({
        receiverType: "Dimension",
        method: "spawnEntity",
      }),
    }));
  });

  it("keeps spawnEntity before a later verification unresolved rather than inventing a hard failure", () => {
    const script = parse(`
      import { world } from "@minecraft/server";
      const dimension = world.getDimension("overworld");
      const block = dimension.getBlock({ x: 0, y: 64, z: 0 });

      block.setType("minecraft:stone");
      dimension.spawnEntity("minecraft:zombie", { x: 5, y: 65, z: 5 });
      if (block.matches("minecraft:stone")) {
        block.addTag;
      }
    `);

    const assessment = analyzeScriptMutationTransactions([script])[0];
    expect(assessment?.status).toBe("late-verification-candidate");
  });

  it("supports project-defined direct Script API handoffs", () => {
    const script = parse(`
      import { world } from "@minecraft/server";
      const dimension = world.getDimension("overworld");
      const block = dimension.getBlock({ x: 0, y: 64, z: 0 });
      const player = world.getAllPlayers()[0];

      block.setType("minecraft:stone");
      if (block.matches("minecraft:stone")) {
        player.setGameMode("adventure");
      }
    `);

    const assessments = analyzeScriptMutationTransactions(
      [script],
      [{
        id: "gameplay-mode-handoff",
        kind: "script-method",
        scriptSymbol: "Player.setGameMode",
        purpose: "gameplay mode activation",
      }],
    );

    expect(assessments).toEqual([
      expect.objectContaining({
        status: "verified-before-dependent",
        dependentLabel: "gameplay mode activation",
        dependentCall: expect.objectContaining({
          symbol: "Player.setGameMode",
        }),
      }),
    ]);
  });

  it("keeps project-defined Script API handoff unproven outside the verified branch", () => {
    const script = parse(`
      import { world } from "@minecraft/server";
      const dimension = world.getDimension("overworld");
      const block = dimension.getBlock({ x: 0, y: 64, z: 0 });
      const player = world.getAllPlayers()[0];

      block.setType("minecraft:stone");
      if (block.matches("minecraft:stone")) {
        player.addTag("verified");
      }
      player.setGameMode("adventure");
    `);

    const assessments = analyzeScriptMutationTransactions(
      [script],
      [{
        id: "gameplay-mode-handoff",
        kind: "script-method",
        scriptSymbol: "Player.setGameMode",
      }],
    );

    expect(assessments[0]?.status).toBe("verification-unresolved");
  });

  it("does not treat an unrelated earlier guard as proof for a later teleport", () => {
    const script = parse(`
      import { world } from "@minecraft/server";
      const dimension = world.getDimension("overworld");
      const block = dimension.getBlock({ x: 0, y: 64, z: 0 });
      const player = world.getAllPlayers()[0];
      block.setType("minecraft:stone");

      if (block.matches("minecraft:stone")) {
        player.addTag("checked");
      }

      player.teleport({ x: 1, y: 65, z: 1 });
    `);

    const assessment = analyzeScriptMutationTransactions([script])[0];
    expect(assessment?.status).toBe("verification-unresolved");
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

  it("follows direct local function calls in execution order", () => {
    const script = parse(`
      import { world } from "@minecraft/server";
      const dimension = world.getDimension("overworld");
      const block = dimension.getBlock({ x: 0, y: 64, z: 0 });
      const player = world.getAllPlayers()[0];

      function verifyAndMove() {
        if (block.matches("minecraft:stone")) {
          player.teleport({ x: 1, y: 65, z: 1 });
        }
      }

      block.setType("minecraft:stone");
      verifyAndMove();
    `);

    expect(script.localFunctionCalls).toEqual([
      expect.objectContaining({
        callerRegion: "module",
        targetRegion: "function:verifyAndMove",
        targetName: "verifyAndMove",
      }),
    ]);

    const assessments = analyzeScriptMutationTransactions([script]);
    expect(assessments).toEqual([
      expect.objectContaining({
        executionRegion: "module",
        applyRegion: "module",
        status: "verified-before-dependent",
        verificationCall: expect.objectContaining({
          executionRegion: "function:verifyAndMove",
          method: "matches",
        }),
        dependentCall: expect.objectContaining({
          executionRegion: "function:verifyAndMove",
          method: "teleport",
        }),
      }),
    ]);
  });

  it("detects late verification across direct local function calls", () => {
    const script = parse(`
      import { world } from "@minecraft/server";
      const dimension = world.getDimension("overworld");
      const block = dimension.getBlock({ x: 0, y: 64, z: 0 });
      const player = world.getAllPlayers()[0];

      function move() {
        player.teleport({ x: 1, y: 65, z: 1 });
      }

      function verify() {
        if (block.matches("minecraft:stone")) {
          player.addTag("verified");
        }
      }

      block.setType("minecraft:stone");
      move();
      verify();
    `);

    expect(analyzeScriptMutationTransactions([script])[0]?.status).toBe(
      "late-verification-candidate",
    );
  });

  it("treats recursive local call paths as an ordering barrier", () => {
    const script = parse(`
      import { world } from "@minecraft/server";
      const dimension = world.getDimension("overworld");
      const block = dimension.getBlock({ x: 0, y: 64, z: 0 });
      const player = world.getAllPlayers()[0];

      function verifyAndMove() {
        recurse();
        if (block.matches("minecraft:stone")) {
          player.teleport({ x: 1, y: 65, z: 1 });
        }
      }

      function recurse() {
        verifyAndMove();
      }

      block.setType("minecraft:stone");
      verifyAndMove();
    `);

    const assessment = analyzeScriptMutationTransactions([script])[0];
    expect(assessment?.status).toBe("verification-unresolved");
    expect(assessment?.barriers).toEqual([
      expect.objectContaining({
        kind: "recursive-call",
        targetRegion: "function:verifyAndMove",
      }),
    ]);
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
    expect(assessments).toEqual([]);
  });
});
