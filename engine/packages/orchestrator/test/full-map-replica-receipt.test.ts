import { describe, expect, it } from "vitest";
import {
  buildFullMapReplicaReceipt,
} from "../src/arena/full-map-replica-receipt.js";

describe("full-map replica receipt", () => {
  it("reuses baseline only when every replica has sufficient proof", () => {
    const result = buildFullMapReplicaReceipt({
      replicaBaseline: "arena:canonical",
      replicas: [{
        replicaId: "arena:2",
        proofStatus: "complete-proof",
        mismatchCount: 0,
        evidenceIds: ["e:a2"],
      }, {
        replicaId: "arena:3",
        proofStatus: "bounded-proof",
        mismatchCount: 0,
        evidenceIds: ["e:a3"],
      }],
    });

    expect(result.baselineReusableForAllReplicas).toBe(true);
    expect(
      result.replicaResults.map(
        (item) => item.replicaStatus,
      ),
    ).toEqual([
      "EQUIVALENT",
      "EQUIVALENT",
    ]);
  });

  it("keeps material divergence separate from incomplete proof", () => {
    const result = buildFullMapReplicaReceipt({
      replicaBaseline: "arena:canonical",
      replicas: [{
        replicaId: "arena:4",
        proofStatus: "diverged",
        mismatchCount: 2,
        evidenceIds: ["e:a4"],
      }, {
        replicaId: "arena:5",
        proofStatus: "no-proof",
        mismatchCount: 0,
        evidenceIds: [],
      }],
    });

    expect(result.replicaDivergenceIds).toEqual([
      "replica-delta:arena:4",
    ]);
    expect(result.incompleteReplicaIds).toEqual([
      "arena:5",
    ]);
    expect(result.baselineReusableForAllReplicas).toBe(false);
  });
});
