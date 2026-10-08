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
