import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../src/parse.js";
import { resolveScriptImports } from "../src/resolve.js";
import { summarizeMinecraftModules } from "../src/module-usage.js";

const source = {
  artifactId: "art_demo",
  relativePath: "behavior_packs/demo/scripts/main.ts",
};

describe("script analyzer", () => {
  it("extracts Minecraft imports, event subscriptions and dynamic properties", () => {
    const parsed = parseScriptFile(
      "scripts/main",
      `
import { world, system } from "@minecraft/server";
import { helper } from "./helper";

world.afterEvents.playerSpawn.subscribe((event) => {
  event.player.setDynamicProperty("joined", true);
});

system.afterEvents.scriptEventReceive.subscribe(() => {});
`,
      source,
    );

    expect(parsed.imports.some((item) => item.module === "@minecraft/server")).toBe(true);
    expect(parsed.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        root: "world",
        phase: "afterEvents",
        event: "playerSpawn",
      }),
      expect.objectContaining({
        root: "system",
        phase: "afterEvents",
        event: "scriptEventReceive",
      }),
    ]));
    expect(parsed.dynamicProperties).toEqual(expect.arrayContaining([
      expect.objectContaining({ operation: "set", propertyId: "joined" }),
    ]));
  });

  it("canonicalizes aliased world/system imports used by bundled scripts", () => {
    const parsed = parseScriptFile(
      "scripts/main",
      `
import { world as world8, system as system5 } from "@minecraft/server";

world8.afterEvents.playerSpawn.subscribe(() => {});
system5.afterEvents.scriptEventReceive.subscribe(() => {});
world8.getDimension("overworld");
system5.runInterval(() => {}, 1);
const board = world8.scoreboard;
`,
      source,
    );

    expect(parsed.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        root: "world",
        phase: "afterEvents",
        event: "playerSpawn",
      }),
      expect.objectContaining({
        root: "system",
        phase: "afterEvents",
        event: "scriptEventReceive",
      }),
    ]));

    expect(parsed.methodCalls).toEqual(expect.arrayContaining([
      expect.objectContaining({
        symbol: "world.getDimension",
        inference: "direct",
        root: "world",
      }),
      expect.objectContaining({
        symbol: "system.runInterval",
        inference: "direct",
        root: "system",
      }),
    ]));

    expect(parsed.propertyAccesses).toEqual(expect.arrayContaining([
      expect.objectContaining({
        symbol: "world.scoreboard",
        inference: "direct",
        root: "world",
      }),
    ]));
  });

  it("extracts direct world and system method symbols without guessing nested receiver types", () => {
    const parsed = parseScriptFile(
      "scripts/main",
      `
import { world, system } from "@minecraft/server";

world.getAllPlayers();
world.getDimension("overworld");
system.runInterval(() => {}, 1);
world.scoreboard.getObjective("round");
`,
      source,
    );

    expect(parsed.methodCalls).toEqual(expect.arrayContaining([
      expect.objectContaining({ symbol: "world.getAllPlayers" }),
      expect.objectContaining({ symbol: "world.getDimension" }),
      expect.objectContaining({ symbol: "system.runInterval" }),
    ]));
  });

  it("infers bounded receiver types through variables, loops, callbacks and property chains", () => {
    const parsed = parseScriptFile(
      "scripts/main",
      `
import { world } from "@minecraft/server";

const dimension = world.getDimension("overworld");
for (const entity of dimension.getEntities()) {
  entity.getTags();
}

world.getAllPlayers().forEach((player) => {
  player.addTag("arena:test");
  player.removeTag("arena:old");
});

const objective = world.scoreboard.getObjective("round");
objective?.getScore("#arena1");
`,
      source,
    );

    expect(parsed.methodCalls).toEqual(expect.arrayContaining([
      expect.objectContaining({ symbol: "world.getDimension", inference: "direct" }),
      expect.objectContaining({ symbol: "Dimension.getEntities", receiverType: "Dimension" }),
      expect.objectContaining({ symbol: "Entity.getTags", receiverType: "Entity" }),
      expect.objectContaining({ symbol: "Entity.addTag", receiverType: "Player" }),
      expect.objectContaining({ symbol: "Entity.removeTag", receiverType: "Player" }),
      expect.objectContaining({ symbol: "Scoreboard.getObjective", receiverType: "Scoreboard" }),
    ]));
  });

  it("propagates a bounded Player return from a local helper built on getAllPlayers().find", () => {
    const parsed = parseScriptFile(
      "scripts/main",
      `
import { world } from "@minecraft/server";

function findPlayer(name) {
  return world.getAllPlayers().find((player) => player.name === name);
}

const player = findPlayer("Alex");
player?.addTag("session:assigned");
`,
      source,
    );

    expect(parsed.methodCalls).toEqual(expect.arrayContaining([
      expect.objectContaining({ symbol: "world.getAllPlayers" }),
      expect.objectContaining({ symbol: "Entity.addTag", receiverType: "Player" }),
    ]));
  });

  it("extracts bounded property symbols and aliased module-member symbols", () => {
    const parsed = parseScriptFile(
      "scripts/main",
      `
import { world, GameMode as GM } from "@minecraft/server";

const player = world.getAllPlayers()[0];
const cameraEnabled = player.inputPermissions.cameraEnabled;
const legacyMode = GM.adventure;
`,
      source,
    );

    expect(parsed.propertyAccesses).toEqual(expect.arrayContaining([
      expect.objectContaining({
        symbol: "Player.inputPermissions",
        receiverType: "Player",
      }),
      expect.objectContaining({
        symbol: "PlayerInputPermissions.cameraEnabled",
        receiverType: "PlayerInputPermissions",
      }),
    ]));

    expect(parsed.moduleMemberAccesses).toEqual(expect.arrayContaining([
      expect.objectContaining({
        module: "@minecraft/server",
        importedName: "GameMode",
        localName: "GM",
        member: "adventure",
        symbol: "GameMode.adventure",
      }),
    ]));
  });

  it("records bounded method call shape evidence", () => {
    const parsed = parseScriptFile(
      "scripts/main",
      `
import { world } from "@minecraft/server";
const player = world.getAllPlayers()[0];
player.applyKnockback(0, 1, 0.5, 0.4);
player.applyKnockback({ x: 0, z: 1 }, 0.4);
`,
      source,
    );

    expect(parsed.methodCalls).toEqual(expect.arrayContaining([
      expect.objectContaining({
        symbol: "Entity.applyKnockback",
        argumentCount: 4,
        argumentKinds: ["number", "number", "number", "number"],
        hasSpreadArgument: false,
      }),
      expect.objectContaining({
        symbol: "Entity.applyKnockback",
        argumentCount: 2,
        argumentKinds: ["object", "number"],
        hasSpreadArgument: false,
      }),
    ]));
  });

  it("classifies direct method result-use safety shapes", () => {
    const parsed = parseScriptFile(
      "scripts/main",
      `
import { world } from "@minecraft/server";
const entity = world.getDimension("overworld").getEntities()[0];
entity.getComponent("minecraft:health").currentValue;
entity.getComponent("minecraft:health")?.currentValue;
const assigned = entity.getComponent("minecraft:health");
`,
      source,
    );

    expect(parsed.methodCalls).toEqual(expect.arrayContaining([
      expect.objectContaining({
        symbol: "Entity.getComponent",
        resultUse: "dereferenced",
      }),
      expect.objectContaining({
        symbol: "Entity.getComponent",
        resultUse: "optional-dereferenced",
      }),
      expect.objectContaining({
        symbol: "Entity.getComponent",
        resultUse: "assigned",
      }),
    ]));
  });

  it("classifies bounded local guards for assigned optional results", () => {
    const parsed = parseScriptFile(
      "scripts/main",
      `
import { world } from "@minecraft/server";
const entity = world.getDimension("overworld").getEntities()[0];

const guarded = entity.getComponent("minecraft:health");
if (guarded) {
  guarded.currentValue;
}

const early = entity.getComponent("minecraft:health");
if (!early) return;
early.currentValue;

const unsafe = entity.getComponent("minecraft:health");
unsafe.currentValue;
`,
      source,
    );

    expect(parsed.methodCalls).toEqual(expect.arrayContaining([
      expect.objectContaining({
        symbol: "Entity.getComponent",
        resultUse: "guarded-assigned",
      }),
      expect.objectContaining({
        symbol: "Entity.getComponent",
        resultUse: "unguarded-assigned",
      }),
    ]));
  });

  it("tracks type-only symbols and bounded namespace members", () => {
    const parsed = parseScriptFile(
      "scripts/main",
      `
import type { WorldInitializeBeforeEvent } from "@minecraft/server";
import * as mc from "@minecraft/server";

const legacy = mc.GameMode.adventure;
type Init = mc.WorldInitializeAfterEvent;
`,
      source,
    );

    expect(parsed.importedSymbols).toEqual(expect.arrayContaining([
      expect.objectContaining({
        importedName: "WorldInitializeBeforeEvent",
        typeOnly: true,
      }),
      expect.objectContaining({
        importedName: "WorldInitializeAfterEvent",
        typeOnly: true,
      }),
    ]));

    expect(parsed.moduleMemberAccesses).toEqual(expect.arrayContaining([
      expect.objectContaining({
        importedName: "GameMode",
        member: "adventure",
        symbol: "GameMode.adventure",
      }),
    ]));
  });

  it("infers component property writes from getComponent identifiers", () => {
    const parsed = parseScriptFile(
      "scripts/main",
      `
import { world } from "@minecraft/server";
const entity = world.getDimension("overworld").getEntities()[0];
const scale = entity.getComponent("minecraft:scale");
scale.value = 2;
const mark = entity.getComponent("minecraft:mark_variant");
mark.value += 1;
`,
      source,
    );

    expect(parsed.propertyWrites).toEqual(expect.arrayContaining([
      expect.objectContaining({
        symbol: "EntityScaleComponent.value",
        operation: "assign",
      }),
      expect.objectContaining({
        symbol: "EntityMarkVariantComponent.value",
        operation: "compound",
      }),
    ]));
  });

  it("captures enum backing-value literal comparisons", () => {
    const parsed = parseScriptFile(
      "scripts/main",
      `
import { BlockComponentTypes as BCT } from "@minecraft/server";
import * as mc from "@minecraft/server";

const a = BCT.FluidContainer === "minecraft:fluidContainer";
const b = "minecraft:fluid_container" !== mc.BlockComponentTypes.FluidContainer;
`,
      source,
    );

    expect(parsed.enumValueComparisons).toEqual(expect.arrayContaining([
      expect.objectContaining({
        symbol: "BlockComponentTypes.FluidContainer",
        operator: "===",
        literal: "minecraft:fluidContainer",
      }),
      expect.objectContaining({
        symbol: "BlockComponentTypes.FluidContainer",
        operator: "!==",
        literal: "minecraft:fluid_container",
      }),
    ]));
  });

  it("resolves relative script imports and summarizes Minecraft modules", () => {
    const main = parseScriptFile(
      "scripts/main",
      'import { world } from "@minecraft/server";\nimport "./helper";',
      source,
    );
    const helper = parseScriptFile(
      "scripts/helper",
      "export const helper = 1;",
      {
        artifactId: "art_demo",
        relativePath: "behavior_packs/demo/scripts/helper.ts",
      },
    );

    expect(resolveScriptImports([main, helper])).toEqual(expect.arrayContaining([
      expect.objectContaining({
        module: "./helper",
        status: "resolved",
        targetIdentifier: "scripts/helper",
      }),
    ]));

    expect(summarizeMinecraftModules([main, helper])).toEqual([
      {
        module: "@minecraft/server",
        files: ["scripts/main"],
        bindings: ["world"],
      },
    ]);
  });
});
