import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../../../../analyzers/scripts/src/index.js";
import { buildInspectionSemanticIr } from "../../src/diagnosis/semantic-ir-stage.js";
import { buildGameplayIntentModel } from "../../src/inspection/gameplay-intent-stage.js";
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

  it("places only exact precedence-arm evidence into existing scenarios", () => {
    const source = {
      artifactId: "map:precedence",
      relativePath: "behavior_packs/demo/scripts/round.js",
    };
    const parsed = parseScriptFile("round", [
      'import { world } from "@minecraft/server";',
      'function startRound(skip) {',
      '  if (skip) return { action: "abort" };',
      '  return { action: "start" };',
      '}',
      'world.afterEvents.playerSpawn.subscribe(() => startRound(false));',
    ].join("\n"), source);
    const ir = buildInspectionSemanticIr({
      parsedFunctions: [], parsedScripts: [{ parsed }],
    });
    const start = ir.execution.outcomes?.find(item => item.value === "start");
    const abort = ir.execution.outcomes?.find(item => item.value === "abort");
    expect(start).toBeDefined();
    expect(abort).toBeDefined();
    const graph: GameplayScenarioGraph = {
      ...emptyGraph,
      components: [{
        id: "component:start", label: "Candidate start",
        kind: "outcome", technicalRole: "authored return",
        gameplayPurpose: "unverified",
        evidenceIds: [start!.id], usedByScenarioIds: ["scenario:start"],
        orphan: false,
      }],
      scenarios: [{
        id: "scenario:start", label: "Start candidate",
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
      item.branchPoints.some(point => point.expression === "skip"));
    expect(trace).toBeDefined();
    const point = trace!.branchPoints.find(item => item.expression === "skip")!;
    const yes = point.branches.find(arm => arm.branch === "true")!;
    const no = point.branches.find(arm => arm.branch === "false")!;
    expect(yes.returnOutcomeIds).toContain(abort!.id);
    expect(yes.precedenceEvidenceIds).toEqual([]);
    expect(yes.evidenceMatchedComponentIds).toEqual([]);
    expect(no.returnOutcomeIds).toContain(start!.id);
    expect(no.precedenceEvidenceIds).toEqual([start!.id]);
    expect(no.evidenceMatchedComponentIds).toEqual(["component:start"]);
    expect(no.scenarioPlacementIds).toEqual(["scenario:start"]);
    expect(no.evidenceWithoutComponentIds).toEqual([]);
    expect(navigation.knowledgeCoverage.wholeGameUnderstandingPercent).toBeNull();
  });

  it("projects candidate state and outcome ownership only through exact evidence IDs", () => {
    const source = { artifactId: "map:behavior",
      relativePath: "behavior_packs/demo/scripts/round.js" };
    const parsed = parseScriptFile("round", [
      'import { world } from "@minecraft/server";',
      'let phase = "idle";',
      'function decide(ready) {',
      '  if (ready) { phase = "active"; return { action: "start" }; }',
      '  else { phase = "blocked"; return { action: "abort" }; }',
      '}',
      'world.afterEvents.playerSpawn.subscribe(() => decide(true));',
    ].join("\n"), source);
    const ir = buildInspectionSemanticIr({
      parsedFunctions: [], parsedScripts: [{ parsed }],
    });
    const start = ir.execution.outcomes?.find(item => item.value === "start");
    const abort = ir.execution.outcomes?.find(item => item.value === "abort");
    const active = ir.state.operations.find(item =>
      item.writtenValue?.kind === "literal" &&
      item.writtenValue.value === "active");
    const blocked = ir.state.operations.find(item =>
      item.writtenValue?.kind === "literal" &&
      item.writtenValue.value === "blocked");
    expect(start && abort && active && blocked).toBeTruthy();
    const graph: GameplayScenarioGraph = {
      ...emptyGraph,
      components: [{
        id: "component:start", label: "Start source record",
        kind: "outcome", technicalRole: "authored return",
        gameplayPurpose: "unverified", evidenceIds: [start!.id],
        usedByScenarioIds: ["scenario:round"], orphan: false,
      }, {
        id: "component:phase", label: "State source record",
        kind: "state", technicalRole: "authored state write",
        gameplayPurpose: "unverified", evidenceIds: [active!.id],
        usedByScenarioIds: ["scenario:round"], orphan: false,
      }, {
        id: "component:fake", label: "Lookalike unlinked record",
        kind: "state", technicalRole: "other",
        gameplayPurpose: "unverified", evidenceIds: [blocked!.id + ":other"],
        usedByScenarioIds: [], orphan: true,
      }],
      scenarios: [{
        id: "scenario:round", label: "Round candidate",
        gameplayStage: "ACTIVE", purpose: "unverified",
        sourceSubjectIds: [], componentIds: ["component:start", "component:phase"],
        causalLinkIds: [], playerCounts: [],
        requiredKnowledgeIds: [], composedScenarioIds: [],
      }],
    };
    const nav = deriveGameplayArchitectureNavigation(graph, {
      relevantSourceCount: 1, indexedSourceCount: 1,
      arenaDetected: false, semanticIr: ir,
    });
    const startCandidate = nav.semanticIrCoverage.stateOutcomeCandidates
      .find(item => item.outcomeId === start!.id);
    const abortCandidate = nav.semanticIrCoverage.stateOutcomeCandidates
      .find(item => item.outcomeId === abort!.id);
    expect(startCandidate?.precedingWriteOperationIds).toEqual([active!.id]);
    expect(startCandidate?.status).toBe("SOURCE_ORDER_CANDIDATE");
    expect(startCandidate?.outcomeComponentIds).toEqual(["component:start"]);
    expect(startCandidate?.precedingWriteComponentIds).toEqual(["component:phase"]);
    expect(startCandidate?.sharedScenarioPlacementIds).toEqual(["scenario:round"]);
    expect(abortCandidate?.precedingWriteOperationIds).toEqual([blocked!.id]);
    expect(abortCandidate?.outcomeComponentIds).toEqual([]);
    expect(abortCandidate?.precedingWriteComponentIds).toEqual([]);
    expect(abortCandidate?.sharedScenarioPlacementIds).toEqual([]);
    expect(nav.knowledgeCoverage.wholeGameUnderstandingStatus)
      .toBe("NOT_MEASURABLE");
    // No additional causal evidence can be manufactured by this projection.
    expect(nav.causalLinks).toEqual([]);
  });


  it("links repeated authored state-write sites through intent and existing scenario navigation", () => {
    const source = {
      artifactId: "map:reset-flow",
      relativePath: "behavior_packs/demo/scripts/session.js",
    };
    const parsed = parseScriptFile("session", [
      'let phase = "idle";',
      "function resetArena() {",
      '  phase = "active";',
      '  phase = "active";',
      "}",
    ].join("\n"), source);
    const ir = buildInspectionSemanticIr({
      parsedFunctions: [], parsedScripts: [{ parsed }],
    });
    const writes = ir.state.operations
      .filter(item => item.operation === "write" &&
        item.writtenValue?.kind === "literal" &&
        item.writtenValue.value === "active")
      .map(item => item.id).sort();
    expect(writes).toHaveLength(2);
    const intent = buildGameplayIntentModel({
      id: "intent:reset", parsedScripts: [{ parsed }], semanticIr: ir,
    });
    const state = intent.nodes.find(item =>
      item.kind === "state" && item.label === "Phase Active");
    expect(state).toBeDefined();
    expect(writes.every(id => state!.evidenceIds.includes(id))).toBe(true);
    const relation = intent.edges.find(item =>
      item.kind === "transitions-to" && item.to === state!.id);
    expect(relation?.status).toBe("inferred");
    expect(writes.every(id => relation!.evidenceIds.includes(id))).toBe(true);

    const graph: GameplayScenarioGraph = {
      ...emptyGraph,
      components: [{
        id: state!.id, label: state!.label, kind: state!.kind,
        technicalRole: "source state write", gameplayPurpose: "unverified",
        evidenceIds: state!.evidenceIds,
        usedByScenarioIds: ["scenario:reset"], orphan: false,
      }],
      scenarios: [{
        id: "scenario:reset", label: "Reset candidate",
        gameplayStage: "CLEANUP", purpose: "unverified",
        sourceSubjectIds: [state!.id],
        componentIds: [state!.id],
        causalLinkIds: [], playerCounts: [],
        requiredKnowledgeIds: [], composedScenarioIds: [],
      }],
    };
    const nav = deriveGameplayArchitectureNavigation(graph, {
      relevantSourceCount: 1, indexedSourceCount: 1,
      arenaDetected: false, semanticIr: ir,
    });
    expect(nav.semanticIrCoverage.stateOperations.linkedIds).toEqual(writes);
    expect(nav.knowledgeCoverage.wholeGameUnderstandingStatus)
      .toBe("NOT_MEASURABLE");
    // Technical provenance cannot promote a gameplay transition to PROVEN.
    expect(nav.causalLinks).toEqual([]);
  });

  it("rejects ambiguous, cross-artifact, unpositioned and wrong-value state write bridges", () => {
    const source = {
      artifactId: "map:source",
      relativePath: "behavior_packs/demo/scripts/session.js",
    };
    const parsed = parseScriptFile("session", [
      'let phase = "idle";',
      "function resetArena() {",
      '  phase = "active";',
      "}",
    ].join("\n"), source);
    const ir = buildInspectionSemanticIr({
      parsedFunctions: [], parsedScripts: [{ parsed }],
    });
    const write = ir.state.operations.find(item =>
      item.operation === "write" &&
      item.writtenValue?.kind === "literal" &&
      item.writtenValue.value === "active");
    expect(write).toBeDefined();
    const linked = (observed: typeof ir): readonly string[] => {
      const intent = buildGameplayIntentModel({
        id: "intent:negative", parsedScripts: [{ parsed }],
        semanticIr: observed,
      });
      return intent.nodes.find(item =>
        item.kind === "state" && item.label === "Phase Active")?.evidenceIds ?? [];
    };
    expect(linked(ir)).toContain(write!.id);
    const crossArtifact = {
      ...ir, state: { ...ir.state,
        operations: ir.state.operations.map(item =>
          item.id === write!.id
            ? { ...item, source: { ...item.source, artifactId: "map:other" } }
            : item),
      },
    };
    expect(linked(crossArtifact)).not.toContain(write!.id);
    const noRange = {
      ...ir, state: { ...ir.state,
        operations: ir.state.operations.map(item =>
          item.id === write!.id
            ? { ...item, source: {
              artifactId: source.artifactId, relativePath: source.relativePath,
            } }
            : item),
      },
    };
    expect(linked(noRange)).not.toContain(write!.id);
    const wrongValue = {
      ...ir, state: { ...ir.state,
        operations: ir.state.operations.map(item =>
          item.id === write!.id
            ? { ...item, writtenValue: { kind: "literal" as const, value: "other" } }
            : item),
      },
    };
    expect(linked(wrongValue)).not.toContain(write!.id);
    const ambiguous = {
      ...ir, state: { ...ir.state,
        operations: [...ir.state.operations, { ...write!, id: write!.id + ":duplicate" }],
      },
    };
    expect(linked(ambiguous)).not.toContain(write!.id);
    expect(linked(ambiguous)).not.toContain(write!.id + ":duplicate");
    const withoutIr = buildGameplayIntentModel({
      id: "intent:without-ir", parsedScripts: [{ parsed }],
    });
    const syntheticOnly = withoutIr.nodes.find(item =>
      item.kind === "state" && item.label === "Phase Active");
    expect(syntheticOnly?.evidenceIds).not.toContain(write!.id);
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
