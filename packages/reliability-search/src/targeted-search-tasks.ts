import type {
  AggregatedBlindspot,
  BlindspotAggregateReport,
} from "./blindspot-aggregate.js";
import type { SearchBudgetPlan } from "./search-budget.js";
import type { BlindspotStrategy } from "./blindspot-tasks.js";

export interface TargetedSearchTask {
  id: string;
  blindspotKey: string;
  priority: "P0" | "P1";
  domain: string;
  operator: string;
  strategies: BlindspotStrategy[];
  budgetWeight: number;
  objective: string;
  maps: string[];
  evidenceCount: number;
}

function objectiveFor(blindspot: AggregatedBlindspot): string {
  if (blindspot.strategies.includes("runtime-observation")) {
    return `Construct targeted scenarios that make ${blindspot.operator} observable at runtime and distinguish mutant behavior from baseline.`;
  }
  if (blindspot.strategies.includes("topology")) {
    return `Increase spatial oracle context for ${blindspot.operator} using repeated-layout or differential evidence.`;
  }
  if (blindspot.strategies.includes("dependency-graph")) {
    return `Strengthen dependency/reference graph evidence for ${blindspot.operator}.`;
  }
  if (blindspot.strategies.includes("generative")) {
    return `Generate state/interleaving scenarios that expose ${blindspot.operator} against explicit invariants.`;
  }
  return `Add a detector or invariant capable of distinguishing ${blindspot.operator} from baseline behavior.`;
}

export function createTargetedSearchTasks(
  blindspots: BlindspotAggregateReport,
  budget: SearchBudgetPlan,
): TargetedSearchTask[] {
  const weightByKey = new Map(
    budget.recommendations.map((item) => [item.key, item.weight]),
  );

  return blindspots.items
    .filter((item) => item.priority === "P0" || item.priority === "P1")
    .map((item) => ({
      id: `search:${item.key}`,
      blindspotKey: item.key,
      priority: item.priority,
      domain: item.domain,
      operator: item.operator,
      strategies: [...item.strategies],
      budgetWeight: weightByKey.get(item.key) ?? 0.5,
      objective: objectiveFor(item),
      maps: [...item.maps],
      evidenceCount: item.occurrences,
    }))
    .sort((a, b) =>
      (a.priority === "P0" ? 0 : 1) - (b.priority === "P0" ? 0 : 1) ||
      b.budgetWeight - a.budgetWeight ||
      b.evidenceCount - a.evidenceCount ||
      a.id.localeCompare(b.id),
    );
}
