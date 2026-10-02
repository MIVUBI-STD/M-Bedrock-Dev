import { describe, expect, it } from "vitest";
import {
  discoverGameplaySurfaces,
} from "../../src/inspection/gameplay-surface-discovery.js";

describe("gameplay surface discovery", () => {
  it("discovers runtime surfaces independently from closure accounting", () => {
    const result = discoverGameplaySurfaces({
      intentSubjectIds: ["phase:lobby"],
      arenaDetected: true,
      arenaCapacityEvidence: true,
      arenaLifecycleEvidence: true,
      arenaCleanupEvidence: false,
      arenaIsolationEvidence: true,
      arenaReplicaEvidence: true,
      stateEvidence: true,
      chunkEvidence: true,
      persistenceEvidence: false,
      economyEvidence: true,
      combatEvidence: true,
      inventoryEvidence: false,
      spatialEvidence: true,
      structureEvidence: true,
      entityEvidence: true,
      boundaryEvidence: true,
    });

    expect(result.surfaceIds).toEqual(
      expect.arrayContaining([
        "phase:lobby",
        "runtime:arena",
        "runtime:arena-capacity",
        "runtime:arena-lifecycle",
        "runtime:arena-isolation",
        "runtime:arena-replica-integrity",
        "runtime:state",
        "runtime:chunks",
        "runtime:economy",
        "runtime:combat",
        "runtime:spatial",
        "runtime:structures",
        "runtime:entities",
        "runtime:boundaries",
      ]),
    );
  });
});
