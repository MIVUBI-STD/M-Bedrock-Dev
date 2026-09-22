import type {
  MutationTestResult,
  MutationDomain,
} from "./mutation-types.js";

export type BlindspotStrategy =
  | "static-analysis"
  | "dependency-graph"
  | "topology"
  | "runtime-observation"
  | "differential"
  | "generative"
  | "invariant";

export interface BlindspotTask {
  id: string;
  operator: string;
  domain: MutationDomain;
  reason: string;
  suggestedStrategies: BlindspotStrategy[];
  priority: "P0" | "P1" | "P2";
  evidence?: string;
}

function strategiesFor(result: MutationTestResult): {
  strategies: BlindspotStrategy[];
  reason: string;
  priority: BlindspotTask["priority"];
} {
  const operator = result.descriptor.operator;

  if (operator === "coordinate-shift") {
    return {
      strategies: ["topology", "differential", "runtime-observation"],
      reason: "Coordinate mutation survived because no spatial oracle distinguished the changed location.",
      priority: "P1",
    };
  }

  if (
    operator === "script-event-drop" ||
    operator === "script-event-duplicate" ||
    operator === "script-event-rename"
  ) {
    return {
      strategies: ["static-analysis", "dependency-graph", "runtime-observation"],
      reason: "Script event lifecycle mutation survived current capability/event detectors.",
      priority: "P0",
    };
  }

  if (operator === "dynamic-property-id-substitution") {
    return {
      strategies: ["static-analysis", "differential", "runtime-observation"],
      reason: "Dynamic-property key mutation lacks a stronger ownership/schema oracle.",
      priority: "P1",
    };
  }

  if (
    operator.includes("reference") ||
    operator.includes("objective")
  ) {
    return {
      strategies: ["dependency-graph", "static-analysis"],
      reason: "Reference mutation survived known-reference/graph validation.",
      priority: "P0",
    };
  }

  if (operator.includes("selector") || operator.includes("tag-filter")) {
    return {
      strategies: ["static-analysis", "generative", "runtime-observation"],
      reason: "Scope mutation survived selector/state-isolation detection.",
      priority: "P0",
    };
  }

  if (result.descriptor.domain === "state-concurrency") {
    return {
      strategies: ["generative", "runtime-observation", "invariant"],
      reason: "Concurrency mutation survived the current state/invariant oracles.",
      priority: "P0",
    };
  }

  return {
    strategies: ["static-analysis", "invariant"],
    reason: "Mutation survived without a domain-specific detector explanation.",
    priority: "P2",
  };
}

export function blindspotTasksFromMutationResults(
  results: readonly MutationTestResult[],
): BlindspotTask[] {
  return results
    .filter((result) => result.status === "survived")
    .map((result) => {
      const mapped = strategiesFor(result);
      return {
        id: `blindspot:${result.descriptor.id}`,
        operator: result.descriptor.operator,
        domain: result.descriptor.domain,
        reason: mapped.reason,
        suggestedStrategies: mapped.strategies,
        priority: mapped.priority,
        ...(result.evidence ? { evidence: result.evidence } : {}),
      };
    })
    .sort((a, b) =>
      ["P0", "P1", "P2"].indexOf(a.priority) - ["P0", "P1", "P2"].indexOf(b.priority) ||
      a.id.localeCompare(b.id),
    );
}
