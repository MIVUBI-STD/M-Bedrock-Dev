import type { BlindspotTask, BlindspotStrategy } from "./blindspot-tasks.js";
import type { MutationDomain } from "./mutation-types.js";

export interface BlindspotTaskOccurrence {
  task: BlindspotTask;
  campaignId: string;
  mapId?: string;
}

export interface AggregatedBlindspot {
  key: string;
  operator: string;
  domain: MutationDomain;
  priority: "P0" | "P1" | "P2";
  occurrences: number;
  maps: string[];
  campaigns: string[];
  strategies: BlindspotStrategy[];
  reasons: string[];
  evidence: string[];
}

export interface BlindspotAggregateReport {
  totalOccurrences: number;
  uniqueBlindspots: number;
  items: AggregatedBlindspot[];
}

function priorityRank(priority: AggregatedBlindspot["priority"]): number {
  return priority === "P0" ? 0 : priority === "P1" ? 1 : 2;
}

export function aggregateBlindspotTasks(
  occurrences: readonly BlindspotTaskOccurrence[],
): BlindspotAggregateReport {
  const buckets = new Map<string, {
    operator: string;
    domain: MutationDomain;
    priority: AggregatedBlindspot["priority"];
    occurrences: number;
    maps: Set<string>;
    campaigns: Set<string>;
    strategies: Set<BlindspotStrategy>;
    reasons: Set<string>;
    evidence: Set<string>;
  }>();

  for (const occurrence of occurrences) {
    const task = occurrence.task;
    const key = `${task.domain}:${task.operator}`;
    const bucket = buckets.get(key) ?? {
      operator: task.operator,
      domain: task.domain,
      priority: task.priority,
      occurrences: 0,
      maps: new Set<string>(),
      campaigns: new Set<string>(),
      strategies: new Set<BlindspotStrategy>(),
      reasons: new Set<string>(),
      evidence: new Set<string>(),
    };

    bucket.occurrences += 1;
    if (priorityRank(task.priority) < priorityRank(bucket.priority)) {
      bucket.priority = task.priority;
    }
    if (occurrence.mapId) bucket.maps.add(occurrence.mapId);
    bucket.campaigns.add(occurrence.campaignId);
    for (const strategy of task.suggestedStrategies) bucket.strategies.add(strategy);
    bucket.reasons.add(task.reason);
    if (task.evidence) bucket.evidence.add(task.evidence);

    buckets.set(key, bucket);
  }

  const items = [...buckets.entries()].map(([key, bucket]) => ({
    key,
    operator: bucket.operator,
    domain: bucket.domain,
    priority: bucket.priority,
    occurrences: bucket.occurrences,
    maps: [...bucket.maps].sort(),
    campaigns: [...bucket.campaigns].sort(),
    strategies: [...bucket.strategies].sort(),
    reasons: [...bucket.reasons].sort(),
    evidence: [...bucket.evidence].sort(),
  })).sort((a, b) =>
    priorityRank(a.priority) - priorityRank(b.priority) ||
    b.occurrences - a.occurrences ||
    b.maps.length - a.maps.length ||
    a.key.localeCompare(b.key),
  );

  return {
    totalOccurrences: occurrences.length,
    uniqueBlindspots: items.length,
    items,
  };
}
