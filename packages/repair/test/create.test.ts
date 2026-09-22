import { describe, expect, it } from "vitest";
import { createPatchTransaction } from "../src/create.js";

describe("createPatchTransaction", () => {
  it("derives affected paths from operations rather than trusting caller metadata", () => {
    const tx = createPatchTransaction({
      title: "derived paths",
      sourceFingerprint: "abc",
      operations: [
        {
          kind: "replace-command",
          source: { artifactId: "a", relativePath: "b.mcfunction", range: { lineStart: 1, lineEnd: 1 } },
          expected: "say b",
          replacement: "say c",
        },
        {
          kind: "replace-command",
          source: { artifactId: "a", relativePath: "a.mcfunction", range: { lineStart: 1, lineEnd: 1 } },
          expected: "say a",
          replacement: "say d",
        },
      ],
      preconditions: [],
      validation: [],
    });

    expect(tx.affectedPaths).toEqual(["a.mcfunction", "b.mcfunction"]);
  });
});
