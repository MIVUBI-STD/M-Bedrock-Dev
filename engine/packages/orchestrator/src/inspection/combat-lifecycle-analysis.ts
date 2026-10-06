import ts from "typescript";
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
  explicitCombatScopeGuards: number;
  hurtHandlersWithoutScopeGuard: number;
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


function explicitCombatScopeGuardsFor(
  script: ParsedScriptFile,
): number {
  const file = ts.createSourceFile(
    script.source.relativePath,
    script.text,
    ts.ScriptTarget.Latest,
    true,
    script.source.relativePath.endsWith(".ts")
      ? ts.ScriptKind.TS
      : ts.ScriptKind.JS,
  );
  let guards = 0;

  const terminalExit = (
    node: ts.Node,
  ): boolean => {
    let found = false;
    const scan = (current: ts.Node): void => {
      if (
        ts.isReturnStatement(current) ||
        ts.isThrowStatement(current)
      ) {
        found = true;
        return;
      }
      if (!found) ts.forEachChild(current, scan);
    };
    scan(node);
    return found;
  };

  const visit = (node: ts.Node): void => {
    if (
      ts.isIfStatement(node) &&
      terminalExit(node.thenStatement)
    ) {
      const text = node.expression.getText(file);
      const hasScope =
        /(?:arena|team)/i.test(text);
      const hasTwoCombatSides =
        /(?:hurtEntity|victim|target)/i.test(text) &&
        /(?:damageSource|damagingEntity|attacker|source|shooter|owner)/i.test(text);
      const compares =
        /===|!==|==|!=/.test(text);
      if (
        hasScope &&
        hasTwoCombatSides &&
        compares
      ) {
        guards += 1;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return guards;
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
  const explicitCombatScopeGuards =
    scripts.reduce(
      (sum, script) =>
        sum +
        explicitCombatScopeGuardsFor(
          script,
        ),
      0,
    );
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
    explicitCombatScopeGuards,
    hurtHandlersWithoutScopeGuard:
      Math.max(
        0,
        hurtHandlers -
          explicitCombatScopeGuards,
      ),
    paths,
  };
}
