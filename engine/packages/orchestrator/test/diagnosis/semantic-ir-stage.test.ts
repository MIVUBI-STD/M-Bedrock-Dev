import { describe, expect, it } from "vitest";
import { parseMcFunction } from "../../../../analyzers/functions/src/index.js";
import { parseScriptFile } from "../../../../analyzers/scripts/src/index.js";
import {
  semanticIrSummary,
  semanticIrExecutionTraces,
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

  it("preserves parsed conditional calls and authored state writes in the technical execution trace", () => {
    const source = { artifactId: "map:sample", relativePath: "scripts/round.js" };
    const parsed = parseScriptFile("round", [
      'let phase = "idle";',
      'function spawnWave() {}',
      'function startWave(ready) {',
      '  if (ready) spawnWave();',
      '  phase = "active";',
      '}',
      'startWave(true);',
    ].join("\n"), source);
    const ir = buildInspectionSemanticIr({
      parsedFunctions: [], parsedScripts: [{ parsed }],
    });
    const call = ir.execution.edges.find(edge => edge.targetLabel === "spawnWave");
    expect(call?.kind).toBe("synchronous-call");
    expect(call?.controlFlow).toBe("conditional");
    const written = ir.state.operations.filter(item =>
      item.operation === "write" &&
      ir.state.surfaces.some(surface =>
        surface.id === item.surfaceId &&
        surface.ref.kind === "script-memory" &&
        surface.ref.key === "scripts/round.js::phase")
    );
    expect(written.some(item =>
      item.writtenValue?.kind === "literal" &&
      item.writtenValue.value === "active")).toBe(true);
    const trace = semanticIrExecutionTraces(ir);
    expect(trace.traces.some(item =>
      item.conditionalExecutionEdgeIds.includes(call!.id) &&
      written.every(write => item.stateWriteOperationIds.includes(write.id)))).toBe(true);
  });


  it("propagates true/false and nested authored guards through Semantic IR and navigation traces", () => {
    const source = { artifactId: "map:guards", relativePath: "scripts/waves.js" };
    const parsed = parseScriptFile("waves", [
      'let phase = "idle";',
      'function spawnWave() {}',
      'function skipWave() {}',
      'function start(ready, wave) {',
      '  if (ready) {',
      '    if (wave > 0) { phase = "active"; spawnWave(); }',
      '  } else { phase = "skipped"; skipWave(); }',
      '  ready && spawnWave();',
      '}',
      'start(true, 1);',
    ].join("\n"), source);
    const ir = buildInspectionSemanticIr({
      parsedFunctions: [], parsedScripts: [{ parsed }],
    });
    const spawnEdges = ir.execution.edges.filter(edge => edge.targetLabel === "spawnWave");
    expect(spawnEdges).toHaveLength(2);
    const nested = spawnEdges.find(edge => edge.lexicalGuards?.length === 2);
    expect(nested?.lexicalGuards?.map(g => [g.expression, g.branch])).toEqual([
      ["ready", "true"], ["wave > 0", "true"],
    ]);
    expect(nested?.lexicalGuards?.every(g =>
      g.source.artifactId === source.artifactId &&
      g.source.relativePath === source.relativePath &&
      g.source.range?.lineStart !== undefined)).toBe(true);
    const shortCircuit = spawnEdges.find(edge => edge.lexicalGuards?.length === 1);
    expect(shortCircuit?.controlFlow).toBe("conditional");
    expect(shortCircuit?.lexicalGuards?.[0]?.expression).toBe("ready");
    const skip = ir.execution.edges.find(edge => edge.targetLabel === "skipWave");
    expect(skip?.lexicalGuards?.map(g => g.branch)).toEqual(["false"]);
    const writes = ir.state.operations.filter(op => op.writtenValue);
    expect(writes.find(op => op.writtenValue?.kind === "literal" &&
      op.writtenValue.value === "active")?.lexicalGuards?.map(g =>
      [g.expression, g.branch])).toEqual([
        ["ready", "true"], ["wave > 0", "true"],
      ]);
    expect(writes.find(op => op.writtenValue?.kind === "literal" &&
      op.writtenValue.value === "skipped")?.lexicalGuards?.map(g =>
      [g.expression, g.branch])).toEqual([["ready", "false"]]);
    const traces = semanticIrExecutionTraces(ir).traces;
    expect(traces.some(trace =>
      trace.guardedExecutionEdges.some(entry => entry.edgeId === nested?.id) &&
      trace.guardedStateWrites.some(entry => entry.guards.length === 2))).toBe(true);
  });

  it("does not infer lexical guard predicates from preceding return statements", () => {
    const source = { artifactId: "map:guards", relativePath: "scripts/exit.js" };
    const parsed = parseScriptFile("exit", [
      'function spawnWave() {}',
      'function start(ready) {',
      '  if (!ready) return;',
      '  spawnWave();',
      '}',
      'start(true);',
    ].join("\n"), source);
    const ir = buildInspectionSemanticIr({
      parsedFunctions: [], parsedScripts: [{ parsed }],
    });
    const call = ir.execution.edges.find(edge => edge.targetLabel === "spawnWave");
    expect(call?.controlFlow).toBe("conditional");
    expect(call?.lexicalGuards).toBeUndefined();
    expect(semanticIrExecutionTraces(ir).traces.some(trace =>
      trace.conditionalExecutionEdgeIds.includes(call!.id) &&
      !trace.guardedExecutionEdges.some(item => item.edgeId === call!.id))).toBe(true);
  });

  it("retains alternative source returns and resource releases without inferring a successful reset", () => {
    const source = {
      artifactId: "map:game",
      relativePath: "behavior_packs/test/scripts/game.js",
    };
    const parsed = parseScriptFile("game", [
      'import { world } from "@minecraft/server";',
      'function finish(ready, player) {',
      '  if (ready) {',
      '    player.removeTag("playing");',
      '    return { status: "done" };',
      '  } else {',
      '    return { status: "blocked" };',
      '  }',
      '}',
      'world.afterEvents.playerSpawn.subscribe((event) => finish(true, event.player));',
    ].join("\n"), source);
    const ir = buildInspectionSemanticIr({
      parsedFunctions: [], parsedScripts: [{ parsed }],
    });
    const outcomes = ir.execution.outcomes ?? [];
    expect(outcomes.map(outcome => outcome.value).sort()).toEqual(["blocked","done"]);
    const done = outcomes.find(outcome => outcome.value === "done");
    const blocked = outcomes.find(outcome => outcome.value === "blocked");
    expect(done?.lexicalGuards?.map(g => [g.expression,g.branch]))
      .toEqual([["ready","true"]]);
    expect(blocked?.lexicalGuards?.map(g => [g.expression,g.branch]))
      .toEqual([["ready","false"]]);
    const release = (ir.state.resourceActions ?? []).find(action =>
      action.surface === "tag" && action.action === "release");
    expect(release?.precision).toBe("exact");
    expect(release?.source.relativePath).toBe(source.relativePath);
    expect(release?.executionRegionId).toBe(done?.executionRegionId);
    const traces = semanticIrExecutionTraces(ir).traces;
    expect(traces.some(trace => done && blocked && release &&
      trace.returnOutcomeIds.includes(done.id) &&
      trace.returnOutcomeIds.includes(blocked.id) &&
      trace.resourceReleaseActionIds.includes(release.id))).toBe(true);
    expect(semanticIrSummary(ir).authoredReturnOutcomes).toBe(2);
    expect(semanticIrSummary(ir).authoredResourceReleases).toBeGreaterThanOrEqual(1);
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
