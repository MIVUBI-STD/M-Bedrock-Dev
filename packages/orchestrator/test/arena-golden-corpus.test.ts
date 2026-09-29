import { describe, expect, it } from "vitest";
import {
  evaluateArenaGoldenAssertions,
  parseArenaGoldenManifest,
} from "../src/arena-golden-corpus.js";

describe("arena golden corpus", () => {
  it("validates focused arena assertions without snapshotting raw inspection output", () => {
    const failures = evaluateArenaGoldenAssertions(
      {
        arenaCount: 6,
        detectionBasis: "reconciled",
        layoutStatus: "consistent",
        proofConclusion: "bounded-proof",
        coverageRatio: 0.8,
        capacityOk: true,
        packIdentityDrift: false,
        releaseStatus: "consistent",
        replicaStatuses: {
          "arena-2": "bounded-proof",
        },
      },
      {
        arenaCount: 6,
        layoutStatus: "consistent",
        proofConclusion: "bounded-proof",
        minCoverageRatio: 0.75,
        capacityOk: true,
        requirePackIdentityDrift: false,
        releaseStatus: "consistent",
        replicaStatuses: {
          "arena-2": "bounded-proof",
        },
      },
    );

    expect(failures).toEqual([]);
  });

  it("evaluates lifecycle cleanup isolation stress and fidelity assertions", () => {
    const failures = evaluateArenaGoldenAssertions(
      {
        arenaCount: 6,
        detectionBasis: "topology",
        proofConclusion: "bounded-proof",
        packIdentityDrift: false,
        releaseStatus: "consistent",
        replicaStatuses: {},
        lifecycleUnresolved: 0,
        cleanupUnresolved: 1,
        sharedGlobalState: 0,
        partitionProofRequired: 1,
        stressStatus: "planned",
        nominalStressPlayers: 30,
        voxelStatus: "verified",
        blockEntityStatus: "verified",
        entityPopulationStatus: "verified",
        tickStateStatus: "incomplete",
        structureInstanceStatus: "verified",
      },
      {
        maxLifecycleUnresolved: 0,
        maxCleanupUnresolved: 1,
        maxSharedGlobalState: 0,
        maxPartitionProofRequired: 1,
        stressStatus: "planned",
        nominalStressPlayers: 30,
        voxelStatus: "verified",
        blockEntityStatus: "verified",
        entityPopulationStatus: "verified",
        tickStateStatus: "incomplete",
        structureInstanceStatus: "verified",
      },
    );

    expect(failures).toEqual([]);
  });

  it("rejects unknown assertion keys", () => {
    expect(() =>
      parseArenaGoldenManifest({
        schemaVersion: 1,
        id: "arena-corpus",
        cases: [{
          id: "map",
          label: "Map",
          artifactFile: "map.mcworld",
          assertions: {
            somethingElse: true,
          },
        }],
      }),
    ).toThrow(/unsupported assertion/);
  });
});
