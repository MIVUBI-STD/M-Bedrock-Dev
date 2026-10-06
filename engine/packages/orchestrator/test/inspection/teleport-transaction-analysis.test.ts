import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../../../../analyzers/scripts/src/index.js";
import { analyzeScriptSpatialMutations } from "../../src/inspection/script-spatial-analysis.js";
import { analyzeTeleportTransactions } from "../../src/inspection/teleport-transaction-analysis.js";

describe("teleport transaction analysis", () => {
  it("recognizes a guarded tryTeleport result", () => {
    const script = parseScriptFile("main", [
      "function move(player) {",
      " const moved = player.tryTeleport({ x: 1, y: 2, z: 3 }, { checkForBlocks: true });",
      " if (!moved) return { status: 'fallback' };",
      " return { status: 'moved' };",
      "}",
    ].join("\n"), { artifactId: "fixture", relativePath: "scripts/main.ts" });
    const result = analyzeTeleportTransactions([script], analyzeScriptSpatialMutations([script]));
    expect(result[0]).toMatchObject({
      mechanism: "tryTeleport",
      resultBinding: "moved",
      resultGuarded: true,
      status: "guarded-apply",
    });
  });
});
