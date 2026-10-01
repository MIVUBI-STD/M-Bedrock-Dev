import {
  describe,
  expect,
  it,
} from "vitest";

describe("repair public API boundary", () => {
  it("does not expose low-level mutation primitives", async () => {
    const api = await import("../src/index.js") as Record<string, unknown>;

    expect(api).not.toHaveProperty("applyPatchTransaction");
    expect(api).not.toHaveProperty("rollbackAppliedFiles");
    expect(api).not.toHaveProperty("atomicWriteText");
  });
});
