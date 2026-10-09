import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../../../../analyzers/scripts/src/index.js";
import { buildInspectionSemanticIr } from "../../src/diagnosis/semantic-ir-stage.js";
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
    expect(trace[0]?.conditionalExecutionEdgeIds).toEqual([]);
    expect(trace[0]?.stateWriteOperationIds).toEqual(["state-op:join"]);
    expect(trace[0]?.temporalRelationIds)
      .toEqual(["time:edge:join", "time:edge:repeat"]);
    expect(trace[0]?.stateOperationIds).toEqual(["state-op:join"]);
    expect(trace[0]?.evidenceMatchedComponentIds).toEqual(["component:join"]);
    expect(navigation.semanticIrCoverage.regionsOutsideTraces)
      .toEqual(["function:unused"]);
    expect(navigation.knowledgeCoverage.wholeGameUnderstandingStatus)
      .toBe("NOT_MEASURABLE");
  });

  it("keeps authored true/false branches distinct and maps only exact scenario evidence", () => {
    const source = {
      artifactId: "map:one",
      relativePath: "behavior_packs/demo/scripts/round.js",
    };
    const parsed = parseScriptFile("round", [
      'import { world } from "@minecraft/server";',
      'let phase = "idle";',
      'function startRound(ready) {',
      '  if (ready) { phase = "active"; return { action: "start" }; }',
      '  else { phase = "blocked"; return { action: "abort" }; }',
      '}',
      'world.afterEvents.playerSpawn.subscribe(() => startRound(true));',
    ].join("\n"), source);
    const ir = buildInspectionSemanticIr({
      parsedFunctions: [], parsedScripts: [{ parsed }],
    });
    const authored = ir.execution.outcomes ?? [];
    const start = authored.find(outcome => outcome.value === "start");
    const abort = authored.find(outcome => outcome.value === "abort");
    expect(start).toBeDefined();
    expect(abort).toBeDefined();
    const graph: GameplayScenarioGraph = {
      ...emptyGraph,
      components: [{
        id: "component:start", label: "Start candidate",
        kind: "outcome", technicalRole: "authored return",
        gameplayPurpose: "unverified", evidenceIds: [start!.id],
        usedByScenarioIds: ["scenario:round"], orphan: false,
      }, {
        // A similar-looking but different ID must never acquire ownership.
        id: "component:other", label: "Abort-like candidate",
        kind: "outcome", technicalRole: "unrelated",
        gameplayPurpose: "unverified", evidenceIds: [abort!.id + ":other"],
        usedByScenarioIds: [], orphan: true,
      }],
      scenarios: [{
        id: "scenario:round", label: "Round candidate",
        gameplayStage: "ACTIVE", purpose: "unverified",
        sourceSubjectIds: [], componentIds: ["component:start"],
        causalLinkIds: [], playerCounts: [],
        requiredKnowledgeIds: [], composedScenarioIds: [],
      }],
    };
    const navigation = deriveGameplayArchitectureNavigation(graph, {
      relevantSourceCount: 1, indexedSourceCount: 1,
      arenaDetected: false, semanticIr: ir,
    });
    const trace = navigation.semanticIrCoverage.executionTraces.find(item =>
      item.entryKind === "event-source" &&
      item.branchPoints.some(point => point.expression === "ready"));
    expect(trace).toBeDefined();
    const point = trace!.branchPoints.find(item => item.expression === "ready")!;
    expect(point.source.artifactId).toBe(source.artifactId);
    expect(point.source.range?.lineStart).toBe(4);
    expect(point.branches.map(arm => arm.branch)).toEqual(["true", "false"]);
    const yes = point.branches.find(arm => arm.branch === "true")!;
    const no = point.branches.find(arm => arm.branch === "false")!;
    expect(yes.returnOutcomeIds).toContain(start!.id);
    expect(no.returnOutcomeIds).toContain(abort!.id);
    expect(yes.returnOutcomeIds).not.toContain(abort!.id);
    expect(no.returnOutcomeIds).not.toContain(start!.id);
    expect(yes.stateWriteOperationIds.length).toBeGreaterThan(0);
    expect(no.stateWriteOperationIds.length).toBeGreaterThan(0);
    expect(yes.evidenceMatchedComponentIds).toEqual(["component:start"]);
    expect(yes.scenarioPlacementIds).toEqual(["scenario:round"]);
    expect(no.evidenceMatchedComponentIds).toEqual([]);
    expect(no.scenarioPlacementIds).toEqual([]);
    expect(no.evidenceWithoutComponentIds).toContain(abort!.id);
    // A trace visits both arms as possibilities; it never says both occurred.
    expect(trace!.returnOutcomeIds).toEqual([abort!.id, start!.id].sort());
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
