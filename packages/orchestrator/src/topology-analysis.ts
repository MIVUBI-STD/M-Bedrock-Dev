import type { ParsedFunction } from "../../../analyzers/functions/src/types.js";
import { flattenCommandEffects } from "../../../analyzers/commands/src/flatten.js";
import type { CommandEffect } from "../../../analyzers/commands/src/effects.js";
import { deriveTopologyCandidates } from "../../../analyzers/topology/src/candidates.js";
import { resolveEffect } from "../../../analyzers/topology/src/effect-resolution.js";
import { detectLinearTopologyOutliers } from "../../../analyzers/topology/src/linear-outliers.js";
import { stateAccessesFromEffects } from "../../../analyzers/topology/src/state-from-effects.js";
import { likelyGlobalAccess } from "../../../analyzers/topology/src/state-scope.js";
import { stateScopeDiagnostics, linearTopologyOutlierDiagnostics } from "../../../analyzers/diagnostics/src/topology-findings.js";

export function analyzeFunctionTopology(
  functions: readonly ParsedFunction[],
) {
  const effects: CommandEffect[] = [];
  for (const fn of functions) {
    for (const command of fn.commands) {
      effects.push(...flattenCommandEffects(command.analysis));
    }
  }

  const stateAccesses = stateAccessesFromEffects(effects);
  const stateDiagnostics = stateScopeDiagnostics(stateAccesses);

  const absoluteContext = {
    origin: { x: 0, y: 0, z: 0 },
  };

  const resolvedSpatialEffects = effects
    .map((effect) => resolveEffect(effect, absoluteContext))
    .filter((effect): effect is NonNullable<typeof effect> => effect !== undefined);

  const candidates = deriveTopologyCandidates(resolvedSpatialEffects);
  const linearOutliers = detectLinearTopologyOutliers(resolvedSpatialEffects);
  const topologyDiagnostics = linearTopologyOutlierDiagnostics(linearOutliers);

  return {
    stateAccesses,
    stateDiagnostics,
    resolvedSpatialEffects,
    candidates,
    linearOutliers,
    topologyDiagnostics,
    broadWrites: stateAccesses.filter(
      (access) => access.access === "write" && likelyGlobalAccess(access),
    ).length,
  };
}
