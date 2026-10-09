import { describe, expect, it } from "vitest";
import {
  challengeGameplayDiscovery,
} from "../../src/inspection/gameplay-discovery-challenger.js";
import type {
  GameplayScenarioGraph,
} from "../../src/inspection/gameplay-scenario-model.js";
import type {
  GameplayIntentModel,
} from "../../../gameplay-intent/src/index.js";
import type {
  SemanticIr,
} from "../../../semantic-ir/src/index.js";

const emptyIntent = {
  nodes: [],
  edges: [],
  evidence: [],
} as unknown as GameplayIntentModel;

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

describe("gameplay discovery challenger", () => {
  it("surfaces raw state operations that have no semantic/scenario owner", () => {
    const ir = {
      schemaVersion: 1,
      execution: {
        regions: [{
          id: "region:grant",
          kind: "script-callback",
          ownerId: "script:test",
          label: "grant",
        }],
        edges: [],
      },
      state: {
        surfaces: [],
        operations: [{
          id: "op:grant",
          executionRegionId: "region:grant",
          surfaceId: "state:inventory-grant",
          operation: "write",
          source: {
            kind: "script",
            locator: "scripts/test.js",
          },
        }],
        authorityBindings: [],
      },
      temporal: {
        relations: [],
      },
    } as unknown as SemanticIr;

    const result = challengeGameplayDiscovery({
      semanticIr: ir,
      intent: emptyIntent,
      graph: emptyGraph,
    });

    expect(result.map((item) => item.kind)).toContain(
      "unowned-state-operation",
    );
  });

  it("surfaces unresolved execution edges instead of silently accepting partial understanding", () => {
    const ir = {
      schemaVersion: 1,
      execution: {
        regions: [{
          id: "region:a",
          kind: "script-function",
          ownerId: "script:test",
          label: "a",
        }],
        edges: [{
          id: "edge:dynamic",
          from: "region:a",
          kind: "event-dispatch",
          targetLabel: "dynamic-event",
          resolution: "unresolved",
          source: {
            kind: "script",
            locator: "scripts/test.js",
          },
        }],
      },
      state: {
        surfaces: [],
        operations: [],
        authorityBindings: [],
      },
      temporal: {
        relations: [],
      },
    } as unknown as SemanticIr;

    const result = challengeGameplayDiscovery({
      semanticIr: ir,
      intent: emptyIntent,
      graph: emptyGraph,
    });

    expect(result.map((item) => item.kind)).toContain(
      "unresolved-execution-edge",
    );
  });

  it("requires a proven scenario even for source-correct state evidence", () => {
    const ir = {
      schemaVersion: 1,
      execution: { regions: [], edges: [] },
      state: { surfaces: [], operations: [{
        id: "state-op:one", executionRegionId: "region:one", surfaceId: "state:score",
        operation: "write", source: { artifactId: "a", relativePath: "scripts/one.js" },
      }], authorityBindings: [] },
      temporal: { relations: [] },
    } as unknown as SemanticIr;
    const intent = { ...emptyIntent,
      nodes: [{ id: "intent:one", status: "authored", evidenceIds: ["state-op:one"] }],
      evidence: [{ id: "state-op:one", scope: "selected-artifact",
        origin: "source-code", locator: "scripts/two.js", summary: "mismatched source" }],
    } as GameplayIntentModel;
    const wrong = challengeGameplayDiscovery({ semanticIr: ir, intent, graph: emptyGraph });
    expect(wrong.map(item => item.kind)).toContain("unowned-state-operation");
    const corrected = { ...intent, evidence: [{ ...intent.evidence[0], locator: "scripts/one.js" }] } as GameplayIntentModel;
    expect(challengeGameplayDiscovery({ semanticIr: ir, intent: corrected, graph: emptyGraph })
      .some(item => item.kind === "unowned-state-operation")).toBe(true);
  });

  it("requires scenario ownership beyond matching source provenance", () => {
    const ir = {
      schemaVersion: 1,
      execution: { regions: [{ id: "region:one", kind: "script-module",
        ownerId: "scripts/one", label: "module",
        source: { artifactId: "a", relativePath: "scripts/one.js" } }], edges: [] },
      state: { surfaces: [], operations: [], authorityBindings: [] },
      temporal: { relations: [] },
    } as unknown as SemanticIr;
    const intent = { ...emptyIntent, nodes: [{
      id: "intent:one", status: "authored", evidenceIds: ["region:one"],
    }], evidence: [{ id: "region:one", scope: "selected-artifact",
      origin: "source-code", locator: "scripts/other.js", summary: "different source" }],
    } as GameplayIntentModel;
    expect(challengeGameplayDiscovery({ semanticIr: ir, intent, graph: emptyGraph })
      .some(item => item.subjectId === "region:one")).toBe(true);
    const matched = { ...intent, evidence: [{
      ...intent.evidence[0], locator: "scripts/one.js",
    }] } as GameplayIntentModel;
    expect(challengeGameplayDiscovery({ semanticIr: ir, intent: matched, graph: emptyGraph })
      .some(item => item.subjectId === "region:one")).toBe(true);
  });

  it("does not admit unregistered or external authored evidence", () => {
    const ir = {
      schemaVersion: 1,
      execution: { regions: [{ id: "region:external", kind: "script-module",
        ownerId: "script:main", label: "module", source: { artifactId: "a", relativePath: "scripts/main.js" } }], edges: [] },
      state: { surfaces: [], operations: [], authorityBindings: [] },
      temporal: { relations: [] },
    } as unknown as SemanticIr;
    const intent = { ...emptyIntent, nodes: [{
      id: "intent:authored", status: "authored", evidenceIds: ["region:external"],
    }] } as GameplayIntentModel;
    expect(challengeGameplayDiscovery({ semanticIr: ir, intent, graph: emptyGraph })
      .some(item => item.subjectId === "region:external")).toBe(true);
    const external = { ...intent, evidence: [{
      id: "region:external", scope: "external-reference", origin: "source-code",
      locator: "external.js", summary: "external reference",
    }] } as GameplayIntentModel;
    expect(challengeGameplayDiscovery({ semanticIr: ir, intent: external, graph: emptyGraph })
      .some(item => item.subjectId === "region:external")).toBe(true);
    const selected = { ...external, evidence: [{
      ...external.evidence[0], scope: "selected-artifact", locator: "scripts/main.js",
    }] } as GameplayIntentModel;
    expect(challengeGameplayDiscovery({ semanticIr: ir, intent: selected, graph: emptyGraph })
      .some(item => item.subjectId === "region:external")).toBe(true);
  });

  it("does not admit hypothetical intent as exact Semantic IR ownership", () => {
    const ir = {
      schemaVersion: 1,
      execution: { regions: [{ id: "region:hypothesis", kind: "script-module",
        ownerId: "scripts/main", label: "module", source: { artifactId: "a", relativePath: "scripts/main.js" } }], edges: [] },
      state: { surfaces: [], operations: [], authorityBindings: [] },
      temporal: { relations: [] },
    } as unknown as SemanticIr;
    const proposed = { ...emptyIntent, nodes: [{
      id: "intent:proposed", status: "hypothesis",
      evidenceIds: ["region:hypothesis"],
    }] } as GameplayIntentModel;
    const findings = challengeGameplayDiscovery({ semanticIr: ir, intent: proposed, graph: emptyGraph });
    expect(findings.map(item => item.subjectId)).toContain("region:hypothesis");
    const authored = { ...proposed, evidence: [{ id: "region:hypothesis", scope: "selected-artifact", origin: "source-code", locator: "scripts/main.js", summary: "exact region" }], nodes: [{
      ...proposed.nodes[0], status: "authored",
    }] } as GameplayIntentModel;
    const admitted = challengeGameplayDiscovery({ semanticIr: ir, intent: authored, graph: emptyGraph });
    expect(admitted.some(item => item.subjectId === "region:hypothesis")).toBe(true);
  });

  it("does not admit inferred intent as a proven Semantic IR owner", () => {
    const ir = {
      schemaVersion: 1,
      execution: { regions: [{ id: "region:inferred", kind: "script-module",
        ownerId: "scripts/main", label: "module", source: { artifactId: "a", relativePath: "scripts/main.js" } }], edges: [] },
      state: { surfaces: [], operations: [], authorityBindings: [] },
      temporal: { relations: [] },
    } as unknown as SemanticIr;
    const intent = { ...emptyIntent, nodes: [{
      id: "intent:inferred", status: "inferred", evidenceIds: ["region:inferred"],
    }] } as GameplayIntentModel;
    expect(challengeGameplayDiscovery({ semanticIr: ir, intent, graph: emptyGraph })
      .some(item => item.subjectId === "region:inferred")).toBe(true);
    const authored = { ...intent, evidence: [{ id: "region:inferred", scope: "selected-artifact", origin: "source-code", locator: "scripts/main.js", summary: "exact region" }], nodes: [{ ...intent.nodes[0], status: "authored" }] } as GameplayIntentModel;
    expect(challengeGameplayDiscovery({ semanticIr: ir, intent: authored, graph: emptyGraph })
      .some(item => item.subjectId === "region:inferred")).toBe(true);
  });

  it("does not admit component membership or unproven causal links as Semantic IR ownership", () => {
    const ir = {
      schemaVersion: 1,
      execution: { regions: [{ id: "region:scenario", kind: "script-module",
        ownerId: "script:main", label: "module" }], edges: [] },
      state: { surfaces: [], operations: [], authorityBindings: [] },
      temporal: { relations: [] },
    } as unknown as SemanticIr;
    const component = { id: "component:scenario", evidenceIds: ["region:scenario"] };
    const link = { id: "link:scenario", status: "DETECTION_GAP",
      evidenceIds: ["region:scenario"] };
    const graph = { ...emptyGraph, components: [component],
      causalLinks: [link] } as unknown as GameplayScenarioGraph;
    expect(challengeGameplayDiscovery({ semanticIr: ir, intent: emptyIntent, graph })
      .some(item => item.subjectId === "region:scenario")).toBe(true);
    const proven = { ...graph, causalLinks: [{ ...link, status: "PROVEN" }] } as GameplayScenarioGraph;
    expect(challengeGameplayDiscovery({ semanticIr: ir, intent: emptyIntent, graph: proven })
      .some(item => item.subjectId === "region:scenario")).toBe(true);
  });

  it("does not accept blocked knowledge receipts as semantic ownership", () => {
    const ir = {
      schemaVersion: 1,
      execution: { regions: [], edges: [{
        id: "edge:receipt", from: "region:a", to: "region:b",
        kind: "synchronous-call", targetLabel: "b",
        resolution: "resolved",
        source: { artifactId: "test", relativePath: "scripts/test.js" },
      }] },
      state: { surfaces: [], operations: [], authorityBindings: [] },
      temporal: { relations: [] },
    } as unknown as SemanticIr;
    const receipt = {
      requirementId: "required:execution",
      scenarioId: "scenario:game",
      domain: "arena-lifecycle",
      status: "MISSING_REQUIRED_KNOWLEDGE",
      evidenceIds: ["edge:receipt"],
      knowledgeIds: [],
      capabilityIdsUsed: [],
      subjectIds: [],
      componentIds: [],
      reason: "No evidence returned",
    };
    const blocked = challengeGameplayDiscovery({
      semanticIr: ir, intent: emptyIntent,
      graph: { ...emptyGraph, knowledgeReceipts: [receipt] } as GameplayScenarioGraph,
    });
    expect(blocked.map((item) => item.kind)).toContain("unowned-execution-edge");
    const satisfied = challengeGameplayDiscovery({
      semanticIr: ir, intent: emptyIntent,
      graph: { ...emptyGraph, knowledgeReceipts: [{
        ...receipt, status: "SATISFIED",
      }] } as GameplayScenarioGraph,
    });
    expect(satisfied.some((item) => item.kind === "unowned-execution-edge"))
      .toBe(true);
  });

  it("does not close a resolved edge using Intent evidence alone", () => {
    const ir = {
      schemaVersion: 1,
      execution: {
        regions: [],
        edges: [{ id: "edge:resolved", from: "region:a",
          to: "region:b", kind: "synchronous-call", targetLabel: "b",
          resolution: "resolved",
          source: { artifactId: "test", relativePath: "scripts/test.js" } }],
      },
      state: { surfaces: [], operations: [], authorityBindings: [] },
      temporal: { relations: [] },
    } as unknown as SemanticIr;
    const gap = challengeGameplayDiscovery({
      semanticIr: ir, intent: emptyIntent, graph: emptyGraph,
    });
    expect(gap.map((item) => item.kind)).toContain("unowned-execution-edge");
    const owned = challengeGameplayDiscovery({
      semanticIr: ir,
      intent: { ...emptyIntent,
        evidence: [{ id: "edge:resolved", scope: "selected-artifact", origin: "source-code", locator: "scripts/test.js", summary: "exact edge" }],
        edges: [{ id: "intent:edge", status: "authored", evidenceIds: ["edge:resolved"] }],
      } as GameplayIntentModel,
      graph: emptyGraph,
    });
    expect(owned.some((item) => item.id === "discovery-challenge:edge:edge:resolved"))
      .toBe(true);
  });

  it("keeps an execution region open when only one of its operations is consumed", () => {
    const ir = {
      schemaVersion: 1,
      execution: {
        regions: [{ id: "region:mixed", kind: "script-function",
          ownerId: "script:test", label: "mixed", source: { artifactId: "test", relativePath: "scripts/test.js" } }],
        edges: [{ id: "edge:mixed", from: "region:mixed",
          kind: "synchronous-call", targetLabel: "other",
          resolution: "resolved", to: "region:other",
          source: { artifactId: "test", relativePath: "scripts/test.js" } }],
      },
      state: { surfaces: [], operations: [
        { id: "op:known", executionRegionId: "region:mixed",
          surfaceId: "state:test", operation: "write",
          source: { artifactId: "test", relativePath: "scripts/test.js" } },
      ], authorityBindings: [] },
      temporal: { relations: [] },
    } as unknown as SemanticIr;
    const intent = { ...emptyIntent,
      nodes: [{ id: "node:test", evidenceIds: ["op:known"] }],
    } as GameplayIntentModel;
    const result = challengeGameplayDiscovery({
      semanticIr: ir, intent, graph: emptyGraph,
    });
    expect(result.some((item) =>
      item.kind === "unowned-execution-region" &&
      item.subjectId === "region:mixed")).toBe(true);
    const explicitlyOwned = challengeGameplayDiscovery({
      semanticIr: ir,
      intent: { ...emptyIntent,
        evidence: [{ id: "region:mixed", scope: "selected-artifact", origin: "source-code", locator: "scripts/test.js", summary: "exact region" }],
        nodes: [{ id: "node:region", status: "authored",
          evidenceIds: ["op:known", "region:mixed"] }],
      } as GameplayIntentModel,
      graph: emptyGraph,
    });
    expect(explicitlyOwned.some((item) =>
      item.kind === "unowned-execution-region" &&
      item.subjectId === "region:mixed")).toBe(true);
  });

  it("accounts for state-only execution regions without inventing ownership", () => {
    const ir = {
      schemaVersion: 1,
      execution: { regions: [{ id: "region:state-only", kind: "script-function",
        ownerId: "script:demo", label: "update" }], edges: [] },
      state: { surfaces: [], operations: [{ id: "op:state-only",
        executionRegionId: "region:state-only", surfaceId: "state:round",
        operation: "write", source: { artifactId: "a", relativePath: "scripts/demo.js" },
      }], authorityBindings: [] },
      temporal: { relations: [] },
    } as unknown as SemanticIr;
    const intent = { ...emptyIntent, nodes: [{
      id: "intent:state", evidenceIds: ["op:state-only"],
    }] } as GameplayIntentModel;
    const findings = challengeGameplayDiscovery({ semanticIr: ir, intent, graph: emptyGraph });
    expect(findings.map(item => item.kind)).toContain("unowned-execution-region");
    expect(findings.map(item => item.kind)).toContain("unowned-state-operation");
  });

  it("keeps unowned standalone script modules visible to Discovery", () => {
    const ir = {
      schemaVersion: 1,
      execution: { regions: [{ id: "module:alone", kind: "script-module",
        ownerId: "scripts/main", label: "module" }], edges: [] },
      state: { surfaces: [], operations: [], authorityBindings: [] },
      temporal: { relations: [] },
    } as unknown as SemanticIr;
    const missing = challengeGameplayDiscovery({ semanticIr: ir, intent: emptyIntent, graph: emptyGraph });
    expect(missing.map(item => item.subjectId)).toContain("module:alone");
    const owned = challengeGameplayDiscovery({
      semanticIr: ir,
      intent: { ...emptyIntent, evidence: [{ id: "module:alone", scope: "selected-artifact", origin: "source-code", locator: "scripts/main.js", summary: "module" }], nodes: [{ id: "intent:module", status: "authored", evidenceIds: ["module:alone"] }] } as GameplayIntentModel,
      graph: emptyGraph,
    });
    expect(owned.some(item => item.subjectId === "module:alone")).toBe(true);
  });

  it("keeps standalone mcfunction sources accountable", () => {
    const ir = {
      schemaVersion: 1,
      execution: { regions: [{ id: "exec:mcfunction-source:standalone",
        kind: "mcfunction", ownerId: "arena/intro", label: "arena/intro", source: { artifactId: "a", relativePath: "functions/intro.mcfunction" } }], edges: [] },
      state: { surfaces: [], operations: [], authorityBindings: [] },
      temporal: { relations: [] },
    } as unknown as SemanticIr;
    const missing = challengeGameplayDiscovery({ semanticIr: ir, intent: emptyIntent, graph: emptyGraph });
    expect(missing.map(item => item.subjectId)).toContain("exec:mcfunction-source:standalone");
    const owned = challengeGameplayDiscovery({ semanticIr: ir,
      intent: { ...emptyIntent, evidence: [{ id: "exec:mcfunction-source:standalone", scope: "selected-artifact", origin: "source-code", locator: "functions/intro.mcfunction", summary: "function" }], nodes: [{
        id: "intent:function", status: "authored", evidenceIds: ["exec:mcfunction-source:standalone"],
      }] } as GameplayIntentModel, graph: emptyGraph });
    expect(owned.some(item => item.subjectId === "exec:mcfunction-source:standalone")).toBe(true);
  });

  it("retains isolated callback and function regions without semantic ownership", () => {
    const ir = {
      schemaVersion: 1,
      execution: { regions: [
        { id: "region:callback", kind: "script-callback", ownerId: "script:demo", label: "callback" },
        { id: "region:function", kind: "script-function", ownerId: "script:demo", label: "function:unused" },
      ], edges: [] },
      state: { surfaces: [], operations: [], authorityBindings: [] },
      temporal: { relations: [] },
    } as unknown as SemanticIr;
    const findings = challengeGameplayDiscovery({ semanticIr: ir, intent: emptyIntent, graph: emptyGraph });
    expect(findings.filter(item => item.kind === "unowned-execution-region")
      .map(item => item.subjectId).sort()).toEqual(["region:callback", "region:function"]);
  });

  it("does not close temporal behavior using a generation guard alone", () => {
    const ir = {
      schemaVersion: 1,
      execution: { regions: [], edges: [] },
      state: { surfaces: [], operations: [], authorityBindings: [] },
      temporal: { relations: [{
        id: "temporal:guarded", from: "region:loop", targetLabel: "tick",
        resolution: "resolved", to: "region:tick", kind: "periodic",
        guardEvidence: "explicit-generation-check",
        source: { artifactId: "test", relativePath: "scripts/test.js" },
      }] },
    } as unknown as SemanticIr;
    const missing = challengeGameplayDiscovery({
      semanticIr: ir, intent: emptyIntent, graph: emptyGraph,
    });
    expect(missing.map((item) => item.kind)).toContain(
      "unowned-temporal-relation",
    );
    const owned = challengeGameplayDiscovery({
      semanticIr: ir,
      intent: { ...emptyIntent, evidence: [{ id: "temporal:guarded", scope: "selected-artifact", origin: "source-code", locator: "scripts/test.js", summary: "scheduler" }], nodes: [{
        id: "node:tick", status: "authored", evidenceIds: ["temporal:guarded"],
      }] } as GameplayIntentModel,
      graph: emptyGraph,
    });
    expect(owned.some((item) =>
      item.kind === "unowned-temporal-relation")).toBe(true);
  });

  it("accepts exact authored evidence only through a proven link in its scenario", () => {
    const id = "exec-edge:wave";
    const path = "scripts/wave.js";
    const ir = { schemaVersion: 1,
      execution: { regions: [], edges: [{ id, from: "exec:a", to: "exec:b",
        kind: "synchronous-call", targetLabel: "spawn", resolution: "resolved",
        source: { artifactId: "demo", relativePath: path } }] },
      state: { surfaces: [], operations: [], authorityBindings: [] },
      temporal: { relations: [] },
    } as unknown as SemanticIr;
    const intent = { ...emptyIntent,
      evidence: [{ id, origin: "source-code", locator: path,
        scope: "selected-artifact", summary: "exact" }],
      nodes: [{ id: "mechanic:wave", status: "authored", evidenceIds: [id] }],
    } as GameplayIntentModel;
    const link = { id: "link:wave", scenarioId: "scenario:wave",
      status: "PROVEN", evidenceIds: [id] };
    const graph = { ...emptyGraph,
      scenarios: [{ id: "scenario:wave", causalLinkIds: [link.id] }],
      causalLinks: [link],
    } as unknown as GameplayScenarioGraph;
    const open = (i: GameplayIntentModel, g: GameplayScenarioGraph) =>
      challengeGameplayDiscovery({ semanticIr: ir, intent: i, graph: g })
        .some(item => item.kind === "unowned-execution-edge");
    expect(open(intent, graph)).toBe(false);
    expect(open(intent, { ...graph, causalLinks: [{ ...link,
      status: "DETECTION_GAP" }] } as GameplayScenarioGraph)).toBe(true);
    expect(open(intent, { ...graph, scenarios: [] } as GameplayScenarioGraph)).toBe(true);
    expect(open({ ...intent, nodes: [{ ...intent.nodes[0],
      status: "inferred" }] } as GameplayIntentModel, graph)).toBe(true);
    expect(open({ ...intent, evidence: [{ ...intent.evidence[0],
      locator: "scripts/other.js" }] } as GameplayIntentModel, graph)).toBe(true);
  });

  it("does not treat referenced unresolved temporal targets as closed", () => {
    const temporal = {
      id: "temporal:missing",
      from: "region:tick",
      targetLabel: "missing",
      resolution: "unresolved",
      kind: "periodic",
      source: { artifactId: "a", relativePath: "behavior_packs/a/functions/tick.json" },
    };
    const ir = {
      schemaVersion: 1,
      execution: { regions: [], edges: [] },
      state: { surfaces: [], operations: [], authorityBindings: [] },
      temporal: { relations: [temporal] },
    } as unknown as SemanticIr;
    const intent = {
      ...emptyIntent,
      nodes: [{ id: "intent:tick", evidenceIds: ["temporal:missing"] }],
    } as GameplayIntentModel;
    const findings = challengeGameplayDiscovery({ semanticIr: ir, intent, graph: emptyGraph });
    expect(findings.map(item => item.id)).toContain("discovery-challenge:temporal:temporal:missing");
  });

  it("does not hide a second operation on an already owned state surface", () => {
    const ir = {
      schemaVersion: 1,
      execution: { regions: [], edges: [] },
      state: {
        surfaces: [],
        operations: [
          { id: "op:grant", executionRegionId: "region:inventory",
            surfaceId: "state:inventory", operation: "write",
            source: { kind: "script", locator: "scripts/inventory.js" } },
          { id: "op:clear", executionRegionId: "region:inventory",
            surfaceId: "state:inventory", operation: "write",
            source: { kind: "script", locator: "scripts/inventory.js" } },
        ],
        authorityBindings: [],
      },
      temporal: { relations: [] },
    } as unknown as SemanticIr;
    const intent = {
      ...emptyIntent,
      nodes: [{ id: "node:inventory", evidenceIds: ["op:grant"] }],
    } as GameplayIntentModel;
    const result = challengeGameplayDiscovery({
      semanticIr: ir, intent, graph: emptyGraph,
    });
    expect(result.filter((item) => item.kind === "unowned-state-operation")
      .map((item) => item.evidenceIds[0])).toEqual(["op:clear"]);
  });
});
