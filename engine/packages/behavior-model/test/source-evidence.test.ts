import { describe, expect, it } from "vitest";
import type { SemanticIr, AuthoredBranchGuard } from "../../semantic-ir/src/index.js";
import type { SourceRef } from "../../project-model/src/index.js";
import { reconcileSourceStateOutcomes } from "../src/index.js";

const src = (line: number, columnStart = 1, columnEnd = 10,
  artifactId = "map:a", relativePath = "scripts/round.js"): SourceRef => ({
  artifactId, relativePath,
  range: { lineStart: line, lineEnd: line, columnStart, columnEnd },
});
const guard = (branch: "true" | "false", line = 3): AuthoredBranchGuard => ({
  expression: "ready", branch, source: src(line),
});
const region = "exec:script:round";
const ir = (): SemanticIr => ({
  schemaVersion: 1,
  execution: {
    regions: [{ id: region, kind: "script-function", ownerId: "round",
      label: "function:run", source: src(1) }],
    edges: [],
    outcomes: [{
      id: "outcome:start", executionRegionId: region,
      propertyName: "action", value: "start",
      source: src(8), lexicalGuards: [guard("true")],
    }, {
      id: "outcome:abort", executionRegionId: region,
      propertyName: "action", value: "abort",
      source: src(9), lexicalGuards: [guard("false")],
    }, {
      id: "outcome:unknown", executionRegionId: region,
      propertyName: "action", value: "unknown",
      source: src(2), lexicalGuards: [guard("true")],
    }],
  },
  state: {
    surfaces: [{ id: "state:phase", ref: { kind: "script-memory", key: "phase" } }],
    operations: [{
      id: "write:active", executionRegionId: region,
      surfaceId: "state:phase", operation: "write",
      writtenValue: { kind: "literal", value: "active" },
      source: src(5), lexicalGuards: [guard("true")],
    }, {
      id: "write:blocked", executionRegionId: region,
      surfaceId: "state:phase", operation: "write",
      writtenValue: { kind: "literal", value: "blocked" },
      source: src(6), lexicalGuards: [guard("false")],
    }, {
      id: "write:too-late", executionRegionId: region,
      surfaceId: "state:phase", operation: "write",
      writtenValue: { kind: "literal", value: "late" },
      source: src(11), lexicalGuards: [guard("true")],
    }, {
      id: "write:other-guard-site", executionRegionId: region,
      surfaceId: "state:phase", operation: "write",
      writtenValue: { kind: "literal", value: "different" },
      source: src(4), lexicalGuards: [guard("true", 4)],
    }, {
      id: "write:another-artifact", executionRegionId: region,
      surfaceId: "state:phase", operation: "write",
      writtenValue: { kind: "literal", value: "foreign" },
      source: src(4,1,10,"map:b"), lexicalGuards: [guard("true")],
    }],
    authorityBindings: [],
  },
  temporal: { relations: [] },
});

describe("source-observed state/outcome reconciliation", () => {
  it("selects only earlier exact-document and same-branch writes", () => {
    const candidate = reconcileSourceStateOutcomes(ir());
    expect(candidate.map(item => item.outcomeId))
      .toEqual(["outcome:abort", "outcome:start", "outcome:unknown"]);
    expect(candidate.find(item => item.outcomeId === "outcome:start")
      ?.precedingWriteOperationIds).toEqual(["write:active"]);
    expect(candidate.find(item => item.outcomeId === "outcome:abort")
      ?.precedingWriteOperationIds).toEqual(["write:blocked"]);
    const start = candidate.find(item => item.outcomeId === "outcome:start");
    expect(start?.status).toBe("SOURCE_ORDER_CANDIDATE");
    expect(start?.provenance).toEqual(expect.objectContaining({
      kind: "source-inference", evidenceCeiling: "inferred",
      evidenceIds: ["outcome:start", "write:active"],
    }));
    expect(candidate.find(item => item.outcomeId === "outcome:unknown")
      ?.status).toBe("UNRESOLVED");
    expect(candidate.find(item => item.outcomeId === "outcome:unknown")
      ?.precedingWriteOperationIds).toEqual([]);
  });

  it("rejects missing positional identity, foreign regions, and unmatched precedence", () => {
    const fixture = ir();
    const output = reconcileSourceStateOutcomes({
      ...fixture,
      execution: {
        ...fixture.execution,
        outcomes: [{
          id: "outcome:bounded", executionRegionId: region,
          propertyName: "action", value: "bounded",
          source: src(8),
          lexicalGuards: [guard("true")],
          precedenceGuards: [guard("false", 2)],
        }, {
          id: "outcome:imprecise", executionRegionId: region,
          propertyName: "action", value: "imprecise",
          source: { artifactId: "map:a", relativePath: "scripts/round.js" },
          lexicalGuards: [guard("true")],
        }],
      },
      state: {
        ...fixture.state,
        operations: [...fixture.state.operations, {
          id: "write:foreign-region", executionRegionId: "different-region",
          surfaceId: "state:phase", operation: "write",
          writtenValue: { kind: "literal", value: "remote" },
          source: src(4), lexicalGuards: [guard("true")],
        }],
      },
    });
    expect(output.every(candidate => candidate.status === "UNRESOLVED")).toBe(true);
    expect(output.every(candidate =>
      candidate.precedingWriteOperationIds.length === 0)).toBe(true);
  });
});
