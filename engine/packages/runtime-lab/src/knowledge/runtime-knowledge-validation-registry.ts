import type { RuntimeExperimentDomain } from "../core/types.js";

export type RuntimeValidationStrategy =
  | "chunk-experiment"
  | "ordering-experiment"
  | "multiplayer-experiment"
  | "persistence-experiment"
  | "gametest-experiment"
  | "profiler-probe"
  | "targeted-probe";

export interface RuntimeKnowledgeDebtEntry {
  knowledgeId: string;
  status: string;
  nextEvidenceOwner: string;
}

export interface RuntimeKnowledgeValidationRoute {
  knowledgeId: string;
  evidenceOwner: string;
  domain: RuntimeExperimentDomain;
  strategy: RuntimeValidationStrategy;
}

export interface RuntimeKnowledgeCoverageReport {
  totalRuntimeDebt: number;
  routed: number;
  unrouted: string[];
  routes: RuntimeKnowledgeValidationRoute[];
}

const OWNER_ROUTES: Readonly<Record<string, {
  domain: RuntimeExperimentDomain;
  strategy: RuntimeValidationStrategy;
}>> = {
  "education-runtime-validation": {
    "domain": "education-runtime",
    "strategy": "targeted-probe"
  },
  "runtime-block-state": {
    "domain": "chunks",
    "strategy": "targeted-probe"
  },
  "runtime-chunk-lifecycle": {
    "domain": "chunks",
    "strategy": "chunk-experiment"
  },
  "runtime-command": {
    "domain": "commands",
    "strategy": "targeted-probe"
  },
  "runtime-dialogue": {
    "domain": "commands",
    "strategy": "targeted-probe"
  },
  "runtime-domain-validation": {
    "domain": "compatibility",
    "strategy": "targeted-probe"
  },
  "runtime-education-profile": {
    "domain": "education-runtime",
    "strategy": "targeted-probe"
  },
  "runtime-entity-behavior-validation": {
    "domain": "entity-lifecycle",
    "strategy": "targeted-probe"
  },
  "runtime-entity-state": {
    "domain": "entity-lifecycle",
    "strategy": "targeted-probe"
  },
  "runtime-event-ordering": {
    "domain": "event-ordering",
    "strategy": "ordering-experiment"
  },
  "runtime-hazard-event": {
    "domain": "state",
    "strategy": "targeted-probe"
  },
  "runtime-interaction": {
    "domain": "commands",
    "strategy": "targeted-probe"
  },
  "runtime-inventory": {
    "domain": "state",
    "strategy": "targeted-probe"
  },
  "runtime-lab": {
    "domain": "compatibility",
    "strategy": "targeted-probe"
  },
  "runtime-mount-state": {
    "domain": "state",
    "strategy": "targeted-probe"
  },
  "runtime-persistence": {
    "domain": "persistence",
    "strategy": "persistence-experiment"
  },
  "runtime-player-session": {
    "domain": "multiplayer",
    "strategy": "multiplayer-experiment"
  },
  "runtime-probe": {
    "domain": "compatibility",
    "strategy": "targeted-probe"
  },
  "runtime-profiler": {
    "domain": "compatibility",
    "strategy": "profiler-probe"
  },
  "runtime-spatial-state": {
    "domain": "chunks",
    "strategy": "targeted-probe"
  },
  "runtime-validation": {
    "domain": "compatibility",
    "strategy": "gametest-experiment"
  },
  "runtime-world-mutation": {
    "domain": "chunks",
    "strategy": "targeted-probe"
  },
  "runtime-world-storage": {
    "domain": "persistence",
    "strategy": "targeted-probe"
  }
} as const;

export function routeRuntimeKnowledgeDebt(
  entries: readonly RuntimeKnowledgeDebtEntry[],
): RuntimeKnowledgeCoverageReport {
  const runtime = entries.filter((entry) => entry.status === "runtime-required");
  const routes: RuntimeKnowledgeValidationRoute[] = [];
  const unrouted: string[] = [];

  for (const entry of runtime) {
    const route = OWNER_ROUTES[entry.nextEvidenceOwner];
    if (!route) {
      unrouted.push(entry.knowledgeId);
      continue;
    }
    routes.push({
      knowledgeId: entry.knowledgeId,
      evidenceOwner: entry.nextEvidenceOwner,
      domain: route.domain,
      strategy: route.strategy,
    });
  }

  return {
    totalRuntimeDebt: runtime.length,
    routed: routes.length,
    unrouted: unrouted.sort(),
    routes: routes.sort((a, b) => a.knowledgeId.localeCompare(b.knowledgeId)),
  };
}

export function runtimeKnowledgeRoutesByStrategy(
  report: RuntimeKnowledgeCoverageReport,
): Readonly<Record<RuntimeValidationStrategy, readonly string[]>> {
  const output: Record<RuntimeValidationStrategy, string[]> = {
    "chunk-experiment": [],
    "ordering-experiment": [],
    "multiplayer-experiment": [],
    "persistence-experiment": [],
    "gametest-experiment": [],
    "profiler-probe": [],
    "targeted-probe": [],
  };
  for (const route of report.routes) output[route.strategy].push(route.knowledgeId);
  for (const values of Object.values(output)) values.sort();
  return output;
}
