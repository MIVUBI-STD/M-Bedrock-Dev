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

  it("prefers a directly matched state operation over broad region source", () => {
    const withOperation: SemanticIr = {
      ...ir,
      state: {
        ...ir.state,
        surfaces: [{
          id: "state:session",
          ref: {
            kind: "dynamic-property",
            key: "session",
          },
        }],
        operations: [{
          id: "op:cleanup",
          executionRegionId: "exec:cleanup",
          surfaceId: "state:session",
          operation: "write",
          source: {
            artifactId: "map",
            relativePath: "scripts/session.ts",
            range: {
              lineStart: 22,
              lineEnd: 22,
            },
          },
        }],
      },
    };

    expect(
      resolveSourceSemanticOwner(
        {
          artifactId: "map",
          relativePath: "scripts/session.ts",
          range: {
            lineStart: 22,
            lineEnd: 22,
          },
        },
        withOperation,
      ),
    ).toBe("exec:cleanup");
  });

  it("does not guess when equally ranked semantic operations disagree", () => {
    const ambiguous: SemanticIr = {
      ...ir,
      execution: {
        ...ir.execution,
        regions: [
          ...ir.execution.regions,
          {
            id: "exec:shadow",
            kind: "script-function",
            ownerId: "scripts/session",
            label: "function:shadow",
          },
        ],
      },
      state: {
        ...ir.state,
        surfaces: [{
          id: "state:session",
          ref: {
            kind: "dynamic-property",
            key: "session",
          },
        }],
        operations: [{
          id: "op:cleanup",
          executionRegionId: "exec:cleanup",
          surfaceId: "state:session",
          operation: "write",
          source: {
            artifactId: "map",
            relativePath: "scripts/session.ts",
            range: {
              lineStart: 22,
              lineEnd: 22,
            },
          },
        }, {
          id: "op:shadow",
          executionRegionId: "exec:shadow",
          surfaceId: "state:session",
          operation: "write",
          source: {
            artifactId: "map",
            relativePath: "scripts/session.ts",
            range: {
              lineStart: 22,
              lineEnd: 22,
            },
          },
        }],
      },
    };

    expect(
      resolveSourceSemanticOwner(
        {
          artifactId: "map",
          relativePath: "scripts/session.ts",
          range: {
            lineStart: 22,
            lineEnd: 22,
          },
        },
        ambiguous,
      ),
    ).toBeUndefined();
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
