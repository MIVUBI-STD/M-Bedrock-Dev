import { describe, expect, it } from "vitest";
import {
  chunkLifecycleDiagnostics,
} from "../src/chunk-lifecycle-diagnostics.js";

const base = {
  worldLoadObservers: 0,
  entityLoadObservers: 0,
  entityRemoveObservers: 0,
  shutdownObservers: 0,
  readinessProbes: 0,
  tickingAreaReadinessStates: 0,
  tickingAreaAcquires: 0,
  tickingAreaReleases: 0,
  capacityChecks: 0,
  pairedLeases: 0,
  acquireWithoutRelease: 0,
  releaseWithoutAcquire: 0,
  dynamicLeaseKeys: 0,
  capacityUncheckedLeases: 0,
  shutdownOnlyCleanupRisk: 0,
  worldLoadReconciliationPaths: 0,
  unguardedDeferredChunkWork: 0,
  entityResidencyObservability:
    "absent" as const,
  leases: [],
};

describe("chunk lifecycle diagnostics", () => {
  it("does not emit a source-risk finding for observability absence alone", () => {
    expect(
      chunkLifecycleDiagnostics(base),
    ).toEqual([]);
  });

  it("emits medium source risk for an acquired lease without release", () => {
    const result =
      chunkLifecycleDiagnostics({
        ...base,
        tickingAreaAcquires: 1,
        acquireWithoutRelease: 1,
      });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      code: "CHUNK_LIFECYCLE_SOURCE_RISK",
      severity: "medium",
      data: {
        acquireWithoutRelease: 1,
        worldLoadReconciliationMissing:
          true,
      },
    });
  });

  it("emits minor source risk for unguarded deferred chunk work without claiming a runtime failure", () => {
    const result =
      chunkLifecycleDiagnostics({
        ...base,
        unguardedDeferredChunkWork: 1,
      });

    expect(result[0]).toMatchObject({
      code: "CHUNK_LIFECYCLE_SOURCE_RISK",
      severity: "minor",
      data: {
        unguardedDeferredChunkWork: 1,
      },
    });
  });
});
