import { describe, expect, it } from "vitest";
import type { SemanticIr } from "../../semantic-ir/src/index.js";
import { semanticIrDiagnostics } from "../src/semantic-ir-diagnostics.js";

const source = {
  artifactId: "a",
  relativePath: "scripts/main.js",
};

describe("semantic IR diagnostics", () => {
  it("keeps unresolved execution and unguarded deferred mutation as evidence gaps", () => {
    const ir: SemanticIr = {
      schemaVersion: 1,
      execution: {
        regions: [{
          id: "exec:module",
          kind: "script-module",
          ownerId: "main",
          label: "module",
          source,
        }, {
          id: "exec:callback",
          kind: "script-callback",
          ownerId: "main",
          label: "callback",
          source,
        }],
        edges: [{
          id: "edge:missing",
          from: "exec:module",
          kind: "synchronous-call",
          targetLabel: "missing/function",
          resolution: "unresolved",
          source,
        }, {
          id: "edge:deferred",
          from: "exec:module",
          to: "exec:callback",
          kind: "deferred",
          targetLabel: "callback",
          resolution: "resolved",
          guardEvidence: "unresolved",
          source,
        }],
      },
      state: {
        surfaces: [{
          id: "state:dynamic-property:round",
          ref: { kind: "dynamic-property", key: "round" },
        }],
        operations: [{
          id: "op:write",
          executionRegionId: "exec:callback",
          surfaceId: "state:dynamic-property:round",
          operation: "write",
          source,
        }],
        authorityBindings: [],
      },
      temporal: {
        relations: [{
          id: "time:deferred",
          from: "exec:module",
          to: "exec:callback",
          targetLabel: "callback",
          resolution: "resolved",
          kind: "deferred",
          guardEvidence: "unresolved",
          source,
        }],
      },
    };

    const diagnostics = semanticIrDiagnostics(ir);
    expect(diagnostics.map((item) => item.code).sort()).toEqual([
      "SEMANTIC_IR_DEFERRED_STATE_GUARD_UNKNOWN",
      "SEMANTIC_IR_EXECUTION_TARGET_UNRESOLVED",
    ]);
    expect(diagnostics.every((item) =>
      item.message.toLowerCase().includes("risk") ||
      item.message.toLowerCase().includes("unknown")
    )).toBe(true);
  });

  it("does not flag guarded deferred mutation", () => {
    const ir: SemanticIr = {
      schemaVersion: 1,
      execution: {
        regions: [{
          id: "a",
          kind: "script-module",
          ownerId: "main",
          label: "module",
          source,
        }, {
          id: "b",
          kind: "script-callback",
          ownerId: "main",
          label: "callback",
          source,
        }],
        edges: [],
      },
      state: {
        surfaces: [{
          id: "s",
          ref: { kind: "script-memory", key: "x" },
        }],
        operations: [{
          id: "o",
          executionRegionId: "b",
          surfaceId: "s",
          operation: "write",
          source,
        }],
        authorityBindings: [],
      },
      temporal: {
        relations: [{
          id: "t",
          from: "a",
          to: "b",
          targetLabel: "callback",
          resolution: "resolved",
          kind: "deferred",
          guardEvidence: "explicit-generation-check",
          source,
        }],
      },
    };

    expect(semanticIrDiagnostics(ir)).toEqual([]);
  });
});
