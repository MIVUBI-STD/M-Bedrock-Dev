import { describe, expect, it } from "vitest";
import { createPatchTransaction } from "../src/create.js";

describe("createPatchTransaction", () => {
  it("requires grounded authorization and derives affected paths", () => {
    const tx = createPatchTransaction({
      title: "derived paths",
      sourceFingerprint: "abc",
      authorization: {
        schemaVersion: 1,
        authorized: true,
        sourceFingerprint: "abc",
        diagnosisEvidenceIds: ["evidence_1"],
        invariantIds: ["arena.release"],
        evidenceFreshness: "fresh",
      },
      operations: [
        {
          kind: "replace-command",
          source: {
            artifactId: "a",
            relativePath: "b.mcfunction",
            range: {
              lineStart: 1,
              lineEnd: 1,
            },
          },
          expected: "say b",
          replacement: "say c",
        },
        {
          kind: "replace-command",
          source: {
            artifactId: "a",
            relativePath: "a.mcfunction",
            range: {
              lineStart: 1,
              lineEnd: 1,
            },
          },
          expected: "say a",
          replacement: "say d",
        },
      ],
      preconditions: [],
      validation: [],
    });

    expect(tx.affectedPaths).toEqual([
      "a.mcfunction",
      "b.mcfunction",
    ]);
  });
});
