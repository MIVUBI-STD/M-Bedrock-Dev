import { describe, expect, it } from "vitest";
import type { RuntimeEvidenceRecord } from "../../../packages/project-model/src/runtime-evidence.js";
import { mergeRuntimeEvidenceRecords } from "../src/runtime-evidence-merge.js";

function record(
  state: RuntimeEvidenceRecord["state"],
  sequence?: number,
  confidence: RuntimeEvidenceRecord["confidence"] = "observed",
): RuntimeEvidenceRecord {
  return {
    predicate: "route-ready",
    state,
    confidence,
    scope: { arenaId: "arena-1", arenaGeneration: 2 },
    ...(sequence === undefined
      ? {}
      : {
          observedAt: {
            streamId: "stream-1",
            sequence,
            tick: sequence,
          },
        }),
  };
}

describe("runtime evidence merge freshness", () => {
  it("lets newer comparable evidence supersede older conflicting state", () => {
    const merged = mergeRuntimeEvidenceRecords([
      record("absent", 10),
      record("present", 11),
    ]);

    expect(merged.map["route-ready"]?.state).toBe("present");
    expect(merged.conflicts).toEqual([]);
    expect(merged.resolvedConflicts).toEqual([
      expect.objectContaining({ resolution: "incoming-newer" }),
    ]);
  });

  it("does not let older evidence overwrite newer state", () => {
    const merged = mergeRuntimeEvidenceRecords([
      record("present", 11),
      record("absent", 10),
    ]);

    expect(merged.map["route-ready"]?.state).toBe("present");
    expect(merged.resolvedConflicts).toEqual([
      expect.objectContaining({ resolution: "previous-newer" }),
    ]);
  });

  it("keeps incomparable conflicting evidence unknown", () => {
    const merged = mergeRuntimeEvidenceRecords([
      record("present"),
      record("absent"),
    ]);

    expect(merged.map["route-ready"]?.state).toBe("unknown");
    expect(merged.conflicts).toEqual(["route-ready"]);
    expect(merged.resolvedConflicts).toEqual([
      expect.objectContaining({ resolution: "unresolved" }),
    ]);
  });

  it("uses stronger confidence only for the same comparable moment", () => {
    const merged = mergeRuntimeEvidenceRecords([
      record("absent", 10, "derived"),
      record("present", 10, "observed"),
    ]);

    expect(merged.map["route-ready"]?.state).toBe("present");
    expect(merged.resolvedConflicts).toEqual([
      expect.objectContaining({
        resolution: "higher-confidence-same-moment",
      }),
    ]);
  });
});
