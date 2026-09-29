import {
  describe,
  expect,
  it,
} from "vitest";
import type {
  SemanticIr,
} from "../../semantic-ir/src/index.js";
import {
  bindSourceEvidenceSemanticOwners,
  resolveSourceSemanticOwner,
} from "../src/report-source-owner.js";

const ir: SemanticIr = {
  schemaVersion: 1,
  execution: {
    regions: [
      {
        id: "exec:cleanup",
        kind: "script-function",
        ownerId: "scripts/session",
        label: "function:cleanup",
        source: {
          artifactId: "map",
          relativePath: "scripts/session.ts",
          range: {
            lineStart: 10,
            lineEnd: 30,
          },
        },
      },
      {
        id: "exec:other",
        kind: "script-function",
        ownerId: "scripts/session",
        label: "function:other",
        source: {
          artifactId: "map",
          relativePath: "scripts/session.ts",
          range: {
            lineStart: 40,
            lineEnd: 60,
          },
        },
      },
    ],
    edges: [],
  },
  state: {
    surfaces: [],
    operations: [],
    authorityBindings: [],
  },
  temporal: {
    relations: [],
  },
};

describe("report source semantic owner", () => {
  it("binds a precise source range to the single containing execution region", () => {
    expect(
      resolveSourceSemanticOwner(
        {
          artifactId: "map",
          relativePath: "scripts/session.ts",
          range: {
            lineStart: 15,
            lineEnd: 16,
          },
        },
        ir,
      ),
    ).toBe("exec:cleanup");
  });

  it("does not guess when equally ranked regions overlap", () => {
    const ambiguous: SemanticIr = {
      ...ir,
      execution: {
        ...ir.execution,
        regions: [
          ir.execution.regions[0]!,
          {
            ...ir.execution.regions[0]!,
            id: "exec:cleanup-shadow",
          },
        ],
      },
    };

    expect(
      resolveSourceSemanticOwner(
        {
          artifactId: "map",
          relativePath: "scripts/session.ts",
          range: {
            lineStart: 15,
            lineEnd: 16,
          },
        },
        ambiguous,
      ),
    ).toBeUndefined();
  });

  it("preserves an explicitly bound owner for later validation", () => {
    const result = bindSourceEvidenceSemanticOwners(
      [{
        source: {
          artifactId: "map",
          relativePath: "scripts/session.ts",
          range: {
            lineStart: 15,
            lineEnd: 16,
          },
        },
        semanticOwnerId: "exec:cleanup",
        reason: "Cleanup mutation.",
      }],
      ir,
    );

    expect(result?.[0]?.semanticOwnerId)
      .toBe("exec:cleanup");
  });
});
