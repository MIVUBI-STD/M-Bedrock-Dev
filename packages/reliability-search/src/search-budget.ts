import type { OperatorEffectivenessReport } from "./operator-effectiveness.js";
import type { BlindspotAggregateReport } from "./blindspot-aggregate.js";

export interface SearchBudgetRecommendation {
  key: string;
  operator: string;
  domain: string;
  weight: number;
  reason: string;
  action: "increase" | "maintain" | "decrease";
}

export interface SearchBudgetPlan {
  recommendations: SearchBudgetRecommendation[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function recommendSearchBudget(
  effectiveness: OperatorEffectivenessReport,
  blindspots: BlindspotAggregateReport,
): SearchBudgetPlan {
  const blindspotByKey = new Map(
    blindspots.items.map((item) => [item.key, item]),
  );

  const recommendations = effectiveness.operators.map((operator) => {
    const key = `${operator.domain}:${operator.operator}`;
    const blindspot = blindspotByKey.get(key);
    const recurrenceBoost = blindspot
      ? Math.min(0.5, blindspot.occurrences * 0.08 + blindspot.maps.length * 0.05)
      : 0;
    const blindspotSignal = operator.survivalRate + recurrenceBoost;
    const evidenceWeight = Math.min(1, Math.log2(operator.total + 1) / 4);
    const weight = clamp(
      0.2 + blindspotSignal * 0.6 + evidenceWeight * 0.2,
      0.1,
      1,
    );

    let action: SearchBudgetRecommendation["action"];
    let reason: string;

    if (operator.survivalRate >= 0.4 || (blindspot?.occurrences ?? 0) >= 2) {
      action = "increase";
      reason = "Operator repeatedly exposes detector gaps; allocate more search and detector-improvement budget.";
    } else if (operator.killRate >= 0.9 && operator.total >= 10 && !blindspot) {
      action = "decrease";
      reason = "Operator is consistently killed with enough evidence; reduce redundant mutation volume but keep sentinel coverage.";
    } else {
      action = "maintain";
      reason = "Evidence is mixed or still sparse; keep current mutation/search pressure.";
    }

    return {
      key,
      operator: operator.operator,
      domain: operator.domain,
      weight,
      reason,
      action,
    };
  }).sort((a, b) =>
    b.weight - a.weight ||
    a.key.localeCompare(b.key),
  );

  return { recommendations };
}
