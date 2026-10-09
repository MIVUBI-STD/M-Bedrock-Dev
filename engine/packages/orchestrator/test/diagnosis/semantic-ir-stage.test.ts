import { describe, expect, it } from "vitest";
import { parseMcFunction } from "../../../../analyzers/functions/src/index.js";
import { parseScriptFile } from "../../../../analyzers/scripts/src/index.js";
import {
  semanticIrSummary,
} from "../../../semantic-ir/src/index.js";
import {
  buildInspectionSemanticIr,
} from "../../src/diagnosis/semantic-ir-stage.js";

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

  it("carries authored tick roots into periodic Semantic IR without claiming missing targets", () => {
    const fn = parseMcFunction("start", "say ready", {
      artifactId: "a",
      relativePath: "behavior_packs/a/functions/start.mcfunction",
    });
    const ir = buildInspectionSemanticIr({
      parsedFunctions: [{ parsed: fn }],
      parsedScripts: [],
      tickFunctionRegistrations: [
        {
          source: { artifactId: "a", relativePath: "behavior_packs/a/functions/tick.json" },
          functions: ["start"],
        },
        {
          source: { artifactId: "a", relativePath: "behavior_packs/b/functions/tick.json" },
          functions: ["missing"],
        },
      ],
    });
    const roots = ir.execution.regions.filter((region) => region.id.startsWith("exec:tick:"));
    expect(roots).toHaveLength(2);
    const periodic = ir.execution.edges.filter((edge) => edge.kind === "periodic");
    expect(periodic).toHaveLength(2);
    expect(periodic.map((edge) => [edge.targetLabel, edge.resolution]).sort()).toEqual([
      ["missing", "unresolved"], ["start", "resolved"],
    ]);
    expect(ir.temporal.relations.filter((relation) => relation.kind === "periodic")).toHaveLength(2);
  });

  it("preserves repeated tick registrations as distinct periodic edges", () => {
    const fn = parseMcFunction("start", "say ready", {
      artifactId: "a", relativePath: "behavior_packs/a/functions/start.mcfunction",
    });
    const ir = buildInspectionSemanticIr({
      parsedFunctions: [{ parsed: fn }], parsedScripts: [],
      tickFunctionRegistrations: [{
        source: { artifactId: "a", relativePath: "behavior_packs/a/functions/tick.json" },
        functions: ["start", "start"],
      }],
    });
    const periodic = ir.execution.edges.filter(edge => edge.kind === "periodic");
    expect(periodic).toHaveLength(2);
    expect(new Set(periodic.map(edge => edge.id)).size).toBe(2);
    expect(ir.temporal.relations.filter(item => item.kind === "periodic")).toHaveLength(2);
  });

  it("keeps duplicate cross-pack functions separate and does not resolve an ambiguous call", () => {
    const source = (pack: string) => ({ artifactId: "a", relativePath: "behavior_packs/" + pack + "/functions/start.mcfunction" });
    const a = parseMcFunction("start", "function start", source("a"));
    const b = parseMcFunction("start", "say ready", source("b"));
    const ir = buildInspectionSemanticIr({
      parsedFunctions: [{ parsed: a }, { parsed: b }], parsedScripts: [],
      tickFunctionRegistrations: [{ source: { artifactId: "a", relativePath: "behavior_packs/a/functions/tick.json" }, functions: ["start"] }],
    });
    const functions = ir.execution.regions.filter(region => region.kind === "mcfunction");
    expect(functions).toHaveLength(2);
    expect(new Set(functions.map(region => region.id)).size).toBe(2);
    expect(ir.execution.edges.filter(edge => edge.targetLabel === "start").every(edge => edge.resolution === "unresolved")).toBe(true);
  });

  it("separates same-name script execution regions and subscriptions across packs", () => {
    const scriptText = [
      'import { world } from "@minecraft/server";',
      'world.afterEvents.playerSpawn.subscribe(() => { world.setDynamicProperty("join", 1); });',
    ].join("\n");
    const first = parseScriptFile("scripts/main", scriptText, {
      artifactId: "a", relativePath: "behavior_packs/a/scripts/main.js",
    });
    const second = parseScriptFile("scripts/main", scriptText, {
      artifactId: "a", relativePath: "behavior_packs/b/scripts/main.js",
    });
    const ir = buildInspectionSemanticIr({
      parsedFunctions: [], parsedScripts: [{ parsed: first }, { parsed: second }],
    });
    expect(ir.execution.regions.filter(region => region.kind === "script-module")).toHaveLength(2);
    expect(ir.execution.regions.filter(region => region.kind === "event-source")).toHaveLength(2);
    expect(ir.execution.edges.filter(edge => edge.kind === "event-dispatch")).toHaveLength(2);
  });

  it("preserves distinct subscriptions of the same event within one script", () => {
    const script = parseScriptFile("scripts/main", [
      'import { world } from "@minecraft/server";',
      'world.afterEvents.playerSpawn.subscribe(() => { world.setDynamicProperty("first", 1); });',
      'world.afterEvents.playerSpawn.subscribe(() => { world.setDynamicProperty("second", 1); });',
    ].join("\n"), {
      artifactId: "a", relativePath: "behavior_packs/a/scripts/main.js",
    });
    const ir = buildInspectionSemanticIr({ parsedFunctions: [], parsedScripts: [{ parsed: script }] });
    const eventRegions = ir.execution.regions.filter(region =>
      region.kind === "event-source" && region.label === "world.afterEvents.playerSpawn");
    expect(eventRegions).toHaveLength(2);
    expect(new Set(eventRegions.map(region => region.id)).size).toBe(2);
    expect(ir.execution.edges.filter(edge => edge.kind === "event-dispatch")).toHaveLength(2);
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
