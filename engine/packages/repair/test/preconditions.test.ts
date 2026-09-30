import { describe, expect, it } from "vitest";
import { verifyPreconditions } from "../src/preconditions.js";

describe("repair preconditions", () => {
  it("fails closed on source fingerprint mismatch", async () => {
    const result = await verifyPreconditions(
      [{ kind: "source-fingerprint", expected: "abc" }],
      { sourceFingerprint: "def" },
    );
    expect(result.ok).toBe(false);
  });

  it("accepts matching text preconditions", async () => {
    const result = await verifyPreconditions(
      [{
        kind: "text-equals",
        source: { artifactId: "art", relativePath: "functions/a.mcfunction" },
        expected: "fill 0 0 0 1 1 1 stone",
      }],
      {
        sourceFingerprint: "abc",
        readText: async () => "fill 0 0 0 1 1 1 stone",
      },
    );
    expect(result.ok).toBe(true);
  });
});
