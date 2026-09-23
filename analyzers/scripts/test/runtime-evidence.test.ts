import { describe, expect, it } from "vitest";
import { parseScriptFile, scriptRuntimeEvidence } from "../src/index.js";

const source = { artifactId: "fixture", relativePath: "scripts/main.ts" };

describe("script runtime evidence", () => {
  it("preserves restricted mutation and event provenance", () => {
    const parsed = parseScriptFile(
      "scripts/main",
      `
        import { world } from "@minecraft/server";
        const player = world.getAllPlayers()[0];
        world.beforeEvents.playerBreakBlock.subscribe(() => {
          player.applyKnockback({ x: 1, z: 0 }, 0.4);
        });
      `,
      source,
    );

    const records = scriptRuntimeEvidence(parsed);
    const restricted = records.find(
      (record) => record.predicate === "restricted-execution-mutation-attempt",
    );
    expect(restricted?.state).toBe("present");
    expect(restricted?.note).toContain("Entity.applyKnockback");
    expect(restricted?.sourceRefs?.[0]?.relativePath).toBe("scripts/main.ts");
    expect(records.some((record) => record.predicate === "before-event-subscription")).toBe(true);
    expect(records.some((record) => record.predicate === "gameplay-knockback-request")).toBe(true);
  });

  it("emits durable-state and deferred-work evidence without claiming completion", () => {
    const parsed = parseScriptFile(
      "scripts/main",
      `
        import { system, world } from "@minecraft/server";
        world.setDynamicProperty("arena", 1);
        system.run(() => {});
      `,
      source,
    );
    const records = scriptRuntimeEvidence(parsed);
    expect(records.some((record) => record.predicate === "durable-state-write")).toBe(true);
    expect(records.some((record) => record.predicate === "deferred-script-work")).toBe(true);
    expect(records.some((record) => record.predicate === "COMMIT")).toBe(false);
  });
});