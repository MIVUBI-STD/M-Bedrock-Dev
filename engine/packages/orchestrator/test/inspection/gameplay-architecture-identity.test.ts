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
  it("reconstructs source-observed event to anonymous callback and state paths without guessing gameplay", () => {
    const source = { artifactId: "world:one",
      relativePath: "behavior_packs/a/scripts/game.js" };
    const ir = {
      schemaVersion: 1,
      execution: {
        regions: [
          { id: "event:join", kind: "event-source", ownerId: "world",
            label: "world.afterEvents.playerJoin", source },
          { id: "callback:anonymous", kind: "script-callback",
            ownerId: "game", label: "callback:1", source },
          { id: "function:unused", kind: "script-function",
            ownerId: "game", label: "unused", source },
        ],
        edges: [
          { id: "edge:join", from: "event:join", to: "callback:anonymous",
            kind: "event-dispatch", resolution: "resolved",
            targetLabel: "callback:1", source },
          { id: "edge:repeat", from: "callback:anonymous", to: "callback:anonymous",
            kind: "periodic", resolution: "resolved",
            targetLabel: "callback:1", source },
          { id: "edge:unknown", from: "callback:anonymous",
            kind: "deferred", resolution: "unresolved",
            targetLabel: "dynamic", source },
        ],
      },
      temporal: { relations: [
        { id: "time:edge:join", from: "event:join", to: "callback:anonymous",
          kind: "event-dispatch", resolution: "resolved",
          targetLabel: "callback:1", source },
        { id: "time:edge:repeat", from: "callback:anonymous",
          to: "callback:anonymous", kind: "periodic", resolution: "resolved",
          targetLabel: "callback:1", source },
      ] },
      state: { surfaces: [], authorityBindings: [],
        operations: [
          { id: "state-op:join", executionRegionId: "callback:anonymous",
            surfaceId: "state:session", operation: "write", source },
          { id: "state-op:unused", executionRegionId: "function:unused",
            surfaceId: "state:session", operation: "read", source },
        ],
      },
    } as unknown as import("../../../semantic-ir/src/index.js").SemanticIr;
    const graph = { ...emptyGraph, components: [{
      id: "component:join", label: "Join", kind: "lifecycle",
      technicalRole: "event handler", gameplayPurpose: "unverified",
      evidenceIds: ["edge:join"], usedByScenarioIds: [], orphan: true,
    }] } as GameplayScenarioGraph;
    const navigation = deriveGameplayArchitectureNavigation(graph, {
      relevantSourceCount: 1, indexedSourceCount: 1,
      arenaDetected: false, semanticIr: ir,
    });
    const trace = navigation.semanticIrCoverage.executionTraces;
    expect(trace).toHaveLength(1);
    expect(trace[0]?.entryRegionId).toBe("event:join");
    expect(trace[0]?.regionIds)
      .toEqual(["callback:anonymous", "event:join"]);
    expect(trace[0]?.executionEdgeIds)
      .toEqual(["edge:join", "edge:repeat", "edge:unknown"]);
    expect(trace[0]?.unresolvedExecutionEdgeIds).toEqual(["edge:unknown"]);
    expect(trace[0]?.temporalRelationIds)
      .toEqual(["time:edge:join", "time:edge:repeat"]);
    expect(trace[0]?.stateOperationIds).toEqual(["state-op:join"]);
    expect(trace[0]?.evidenceMatchedComponentIds).toEqual(["component:join"]);
    expect(navigation.semanticIrCoverage.regionsOutsideTraces)
      .toEqual(["function:unused"]);
    expect(navigation.knowledgeCoverage.wholeGameUnderstandingStatus)
      .toBe("NOT_MEASURABLE");
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
