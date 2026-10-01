import type {
  ParsedScriptFile,
  ScriptCombatLifecycleEvidence,
} from "../../../../analyzers/scripts/src/index.js";

export interface CombatEventPathAssessment {
  scriptId: string;
  event: "hurt" | "death";
  callbackRegion: string;
  reachableRegions: readonly string[];
  damageApplications: number;
  knockbackEffects: number;
  statusEffects: number;
  ignitions: number;
  projectileSpawns: number;
  projectileRemovals: number;
}

export interface CombatLifecycleAnalysis {
  hurtHandlers: number;
  deathHandlers: number;
  damageApplications: number;
  secondaryEffects: number;
  projectileSpawns: number;
  projectileRemovals: number;
  projectileCleanupGap: number;
  hurtOnlyTerminalRisk: number;
  paths: readonly CombatEventPathAssessment[];
}

function graphFor(
  script: ParsedScriptFile,
): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  for (const call of script.localFunctionCalls) {
    const set =
      graph.get(call.callerRegion) ??
      new Set<string>();
    set.add(call.targetRegion);
    graph.set(call.callerRegion, set);
  }
  return graph;
}

function reachable(
  graph: ReadonlyMap<string, ReadonlySet<string>>,
  root: string,
): string[] {
  const seen = new Set<string>([root]);
  const queue = [root];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of graph.get(current) ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }

  return [...seen].sort();
}

function eventFrom(
  evidence: ScriptCombatLifecycleEvidence,
): "hurt" | "death" | undefined {
  return evidence.kind === "hurt-subscription"
    ? "hurt"
    : evidence.kind === "death-subscription"
      ? "death"
      : undefined;
}

function countKind(
  evidence: readonly ScriptCombatLifecycleEvidence[],
  kind: ScriptCombatLifecycleEvidence["kind"],
): number {
  return evidence.filter(
    (item) => item.kind === kind,
  ).length;
}

function analyzeScript(
  script: ParsedScriptFile,
): CombatEventPathAssessment[] {
  const graph = graphFor(script);
  const evidence =
    script.combatLifecycleEvidence ?? [];
  const subscriptions = evidence.filter(
    (item) =>
      item.kind === "hurt-subscription" ||
      item.kind === "death-subscription",
  );

  return subscriptions.map((subscription) => {
    const event = eventFrom(subscription)!;
    const regions = reachable(
      graph,
      subscription.executionRegion,
    );
    const scoped = evidence.filter(
      (item) =>
        regions.includes(
          item.executionRegion,
        ),
    );

    return {
      scriptId: script.identifier,
      event,
      callbackRegion:
        subscription.executionRegion,
      reachableRegions: regions,
      damageApplications:
        countKind(scoped, "damage-apply"),
      knockbackEffects:
        countKind(scoped, "knockback"),
      statusEffects:
        countKind(scoped, "effect-apply"),
      ignitions:
        countKind(scoped, "ignite"),
      projectileSpawns:
        countKind(scoped, "projectile-spawn"),
      projectileRemovals:
        countKind(scoped, "projectile-remove"),
    };
  });
}

export function analyzeCombatLifecycle(
  scripts: readonly ParsedScriptFile[],
): CombatLifecycleAnalysis {
  const paths = scripts
    .flatMap(analyzeScript)
    .sort((a, b) =>
      a.scriptId.localeCompare(b.scriptId) ||
      a.event.localeCompare(b.event) ||
      a.callbackRegion.localeCompare(
        b.callbackRegion,
      )
    );

  const allEvidence =
    scripts.flatMap(
      (script) =>
        script.combatLifecycleEvidence ?? [],
    );
  const projectileSpawns =
    countKind(
      allEvidence,
      "projectile-spawn",
    );
  const projectileRemovals =
    countKind(
      allEvidence,
      "projectile-remove",
    );

  const hurtHandlers = paths.filter(
    (item) => item.event === "hurt",
  ).length;
  const deathHandlers = paths.filter(
    (item) => item.event === "death",
  ).length;

  return {
    hurtHandlers,
    deathHandlers,
    damageApplications:
      countKind(
        allEvidence,
        "damage-apply",
      ),
    secondaryEffects:
      countKind(allEvidence, "knockback") +
      countKind(allEvidence, "effect-apply") +
      countKind(allEvidence, "ignite"),
    projectileSpawns,
    projectileRemovals,
    projectileCleanupGap:
      projectileSpawns > 0 &&
      projectileRemovals === 0
        ? projectileSpawns
        : 0,
    hurtOnlyTerminalRisk:
      hurtHandlers > 0 &&
      deathHandlers === 0
        ? hurtHandlers
        : 0,
    paths,
  };
}
