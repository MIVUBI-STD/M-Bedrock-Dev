import { describe, expect, it } from "vitest";
import { validateArchivePath } from "../src/path-safety.js";

describe("validateArchivePath", () => {
  it("accepts a normal Bedrock path", () => {
    expect(validateArchivePath("behavior_packs/demo/functions/start.mcfunction", 32)).toEqual({
      ok: true,
      normalized: "behavior_packs/demo/functions/start.mcfunction",
    });
  });

  it("rejects traversal", () => {
    expect(validateArchivePath("../../outside.txt", 32).ok).toBe(false);
  });

  it("rejects Windows absolute paths", () => {
    expect(validateArchivePath("C:\\Windows\\System32\\x", 32).ok).toBe(false);
  });

  it("rejects reserved Windows device names", () => {
    expect(validateArchivePath("behavior_packs/con/file.json", 32).ok).toBe(false);
  });
});
