import { describe, expect, it } from "vitest";
import { validateWorkspaceVersions } from "./workspace-version.js";

describe("workspace version layout", () => {
  it("keeps current reports aligned with project and level bindings", async () => {
    await expect(validateWorkspaceVersions()).resolves.toBeUndefined();
  });
});
