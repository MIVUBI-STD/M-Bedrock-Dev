import { describe, expect, it } from "vitest";
import {
  deriveGameplayArchitectureNavigation,
  type GameplayScenarioGraph,
} from "../../src/inspection/gameplay-scenario-model.js";

const emptyGraph: GameplayScenarioGraph = {
  schemaVersion: 1,
  policy: "scenario-driven-causal-audit",
  scenarios: [],
  components: [],
  causalLinks: [],
  knowledgeRequirements: [],
  knowledgeReceipts: [],
  requiredInspectionGraph: {
    policy: "required-inspection-graph",
    nodes: [],
    receipts: [],
  },
};

describe("arena identity evidence propagation", () => {
  it("preserves conflicting replica receipts and exposes duplicate arena identities", () => {
    const navigation = deriveGameplayArchitectureNavigation(emptyGraph, {
      relevantSourceCount: 1,
      indexedSourceCount: 1,
      arenaDetected: true,
      arenaCount: 2,
      replicaProof: [
        { arenaId: "arena-2", evidenceIds: ["proof:first"], status: "complete-proof" },
        { arenaId: "arena-2", evidenceIds: ["proof:second"], status: "diverged" },
      ],
    });

    expect(navigation.knowledgeCoverage.arenaEvidence.duplicateReplicaProofArenaIds)
      .toEqual(["arena-2"]);
    expect(navigation.knowledgeCoverage.arenaEvidence.replicaProofEntries)
      .toEqual([
        { arenaId: "arena-2", evidenceIds: ["proof:first"], proofStatus: "complete-proof" },
        { arenaId: "arena-2", evidenceIds: ["proof:second"], proofStatus: "diverged" },
      ]);
    expect(navigation.architectureReconciliation.arenaMappingUnresolved).toBe(true);
    expect(navigation.architectureReconciliation.status).toBe("GAPS_PRESENT");
  });
  it("does not reconcile duplicate spatial arena identities", () => {
    const navigation = deriveGameplayArchitectureNavigation(emptyGraph, {
      relevantSourceCount: 1,
      indexedSourceCount: 1,
      arenaDetected: true,
      arenaCount: 2,
      spatialLayout: {
        canonical: { arenaId: "arena-1", anchor: { x: 0, y: 0, z: 0 } },
        replicas: [{ arenaId: "arena-1", anchor: { x: 100, y: 0, z: 0 } }],
        confidence: "high",
      },
    });

    expect(navigation.knowledgeCoverage.arenaEvidence.arenasWithoutSpatialLayoutCount).toBeNull();
    expect(navigation.architectureReconciliation.arenaMappingUnresolved).toBe(true);
    expect(navigation.architectureReconciliation.status).toBe("GAPS_PRESENT");
  });

});
