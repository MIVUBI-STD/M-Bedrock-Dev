import { describe, expect, it } from "vitest";
import {
  evidenceIdentity,
} from "../src/evidence-identity.js";

describe("evidence identity", () => {
  it("is stable for the same evidence provenance", () => {
    const input = {
      kind: "source" as const,
      subject: "arena.release",
      source: {
        artifactId: "artifact:test",
        relativePath: "scripts\\arena.ts",
        range: {
          lineStart: 10,
          lineEnd: 14,
        },
      },
      revision: "parser:1",
    };

    expect(evidenceIdentity(input)).toBe(
      evidenceIdentity({
        ...input,
        source: {
          ...input.source,
          relativePath: "scripts/arena.ts",
        },
      }),
    );
  });

  it("changes when target-bound runtime provenance changes", () => {
    const a = evidenceIdentity({
      kind: "runtime",
      subject: "arena.release",
      provenanceKey: "trial:1",
      targetProfileFingerprint: "profile:a",
    });
    const b = evidenceIdentity({
      kind: "runtime",
      subject: "arena.release",
      provenanceKey: "trial:1",
      targetProfileFingerprint: "profile:b",
    });

    expect(a).not.toBe(b);
  });
});
