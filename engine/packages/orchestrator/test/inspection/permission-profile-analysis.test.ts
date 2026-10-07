import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../../../../analyzers/scripts/src/index.js";
import { analyzePermissionProfile } from "../../src/inspection/permission-profile-analysis.js";

describe("permission profile analysis", () => {
  it("keeps player and custom-command permission surfaces separate", () => {
    const text = `
const role = PlayerPermissionLevel.Operator;
customCommandRegistry.registerCommand({
  name: "demo:debug_skip",
  permissionLevel: CommandPermissionLevel.Admin,
}, () => {});
`;
    const parsed = parseScriptFile("main", text, {
      artifactId: "fixture", relativePath: "scripts/main.ts",
    });
    const result = analyzePermissionProfile([{ parsed, text }]);
    expect(result.playerPermissionReferences).toEqual(["Operator"]);
    expect(result.commandPermissionReferences).toEqual(["Admin"]);
    expect(result.customCommands[0]).toMatchObject({
      commandId: "demo:debug_skip",
      permissionLevel: "Admin",
    });
    expect(result.devCommandsWithoutExplicitPermission).toBe(0);
  });

  it("flags dev-like custom commands with no authored permission level", () => {
    const text = 'registry.registerCommand({ name: "demo:dev_test" }, () => {});';
    const parsed = parseScriptFile("main", text, {
      artifactId: "fixture", relativePath: "scripts/main.ts",
    });
    expect(analyzePermissionProfile([{ parsed, text }]).devCommandsWithoutExplicitPermission).toBe(1);
  });
});
