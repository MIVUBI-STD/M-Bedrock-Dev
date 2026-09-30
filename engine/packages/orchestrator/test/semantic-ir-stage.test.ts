import { describe, expect, it } from "vitest";
import { parseMcFunction } from "../../../analyzers/functions/src/index.js";
import { parseScriptFile } from "../../../analyzers/scripts/src/index.js";
import {
  semanticIrSummary,
} from "../../semantic-ir/src/index.js";
import {
  buildInspectionSemanticIr,
} from "../src/semantic-ir-stage.js";

describe("inspection semantic IR", () => {
  it("links event, deferred callback, state operations and mcfunction calls without guessing unresolved targets", () => {
    const script = parseScriptFile(
      "main",
      [
        'import { world, system } from "@minecraft/server";',
        'function start() {',
        '  world.setDynamicProperty("round", 1);',
        '  system.run(() => {',
        '    world.getDynamicProperty("round");',
        '    world.runCommand("function arena/start");',
        '  });',
        '}',
        'world.afterEvents.playerSpawn.subscribe(() => { start(); });',
      ].join("\n"),
      {
        artifactId: "a",
        relativePath: "scripts/main.js",
      },
    );
    const fn = parseMcFunction(
      "arena/start",
      [
        "scoreboard players add @s score 1",
        "tag @s add ready",
        "function missing/next",
      ].join("\n"),
      {
        artifactId: "a",
        relativePath: "functions/arena/start.mcfunction",
      },
    );

    const ir = buildInspectionSemanticIr({
      parsedScripts: [{ parsed: script }],
      parsedFunctions: [{ parsed: fn }],
      stateAuthorityContracts: [{
        id: "arena-ready",
        authority: { kind: "scoreboard", key: "score" },
        mirrors: [{ kind: "tag", key: "ready" }],
        scope: "player",
      }],
    });

    const summary = semanticIrSummary(ir);
    expect(summary.eventDispatches).toBe(1);
    expect(summary.deferredEdges).toBe(1);
    expect(summary.authorityContracts).toBe(1);
    expect(summary.stateReads).toBeGreaterThan(0);
    expect(summary.stateWrites).toBeGreaterThan(1);
    expect(summary.unresolvedExecutionTargets).toBe(1);

    const deferred = ir.temporal.relations.find(
      (item) => item.kind === "deferred",
    );
    expect(deferred?.guardEvidence).toBe("unresolved");
  });

  it("preserves explicit generation guards on deferred work", () => {
    const script = parseScriptFile(
      "guarded",
      [
        'import { system } from "@minecraft/server";',
        'const generation = 1;',
        'system.run(() => {',
        '  if (generation !== currentGeneration) return;',
        '});',
      ].join("\n"),
      {
        artifactId: "a",
        relativePath: "scripts/guarded.js",
      },
    );

    const ir = buildInspectionSemanticIr({
      parsedScripts: [{ parsed: script }],
      parsedFunctions: [],
    });

    expect(ir.temporal.relations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "deferred",
          guardEvidence: "explicit-generation-check",
        }),
      ]),
    );
  });
});
