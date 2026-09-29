import {
  describe,
  expect,
  it,
} from "vitest";
import {
  derivePrimaryFailureSignalsFromDiagnostics,
} from "../src/report-classification-producers.js";

describe("report classification producers", () => {
  it("maps explicit entity diagnostic families to entity-decision", () => {
    const result =
      derivePrimaryFailureSignalsFromDiagnostics([
        {
          id: "diag:entity",
          code: "ENTITY_TRIGGER_EVENT_UNDEFINED",
          severity: "medium",
          message: "Undefined event.",
        },
      ]);

    expect(result.signals).toEqual([
      {
        failure: "entity-decision",
        evidenceIds: ["diag:entity"],
      },
    ]);
    expect(result.unmappedFindingIds).toEqual([]);
  });

  it("maps explicit script compatibility diagnostics to runtime-compatibility", () => {
    const result =
      derivePrimaryFailureSignalsFromDiagnostics([
        {
          id: "diag:compat",
          code: "SCRIPT_API_REMOVED_SYMBOL",
          severity: "critical",
          message: "Removed symbol.",
        },
      ]);

    expect(result.signals[0]?.failure)
      .toBe("runtime-compatibility");
  });

  it("does not infer primary failure for ambiguous diagnostics", () => {
    const result =
      derivePrimaryFailureSignalsFromDiagnostics([
        {
          id: "diag:unknown",
          code: "UNKNOWN_COMMAND_EFFECT",
          severity: "minor",
          message: "Unknown effect.",
        },
      ]);

    expect(result.signals).toEqual([]);
    expect(result.unmappedFindingIds)
      .toEqual(["diag:unknown"]);
  });

  it("never derives report impact from diagnostic severity", () => {
    const result =
      derivePrimaryFailureSignalsFromDiagnostics([
        {
          id: "diag:capacity",
          code: "ARENA_CONCURRENCY_CAPACITY_SHORTFALL",
          severity: "critical",
          message: "Capacity shortfall.",
        },
      ]);

    expect(result.signals).toEqual([
      {
        failure: "session-concurrency",
        evidenceIds: ["diag:capacity"],
      },
    ]);
    expect(
      "impact" in result,
    ).toBe(false);
  });
});
