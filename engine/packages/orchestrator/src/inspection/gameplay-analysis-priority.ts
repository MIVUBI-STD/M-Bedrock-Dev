import {
  assessAuditRisk,
  type AuditRiskAssessment,
  type AuditRiskFactor,
} from "../../../diagnostic-reasoning/src/index.js";
import type {
  GameplayWorldModel,
} from "./gameplay-world-model.js";
import type {
  CapabilityExposureSummary,
} from "./capability-exposure-stage.js";

function factorsForSurface(
  surfaceId: string,
  world: GameplayWorldModel,
  capabilities: CapabilityExposureSummary,
): readonly AuditRiskFactor[] {
  switch (surfaceId) {
    case "runtime:arena":
      return ["multiplayer"];
    case "runtime:arena-capacity":
      return [
        "multiplayer",
        "capacity",
        "external-runtime-dependency",
      ];
    case "runtime:arena-lifecycle":
      return [
        "multiplayer",
        "terminal-transition",
      ];
    case "runtime:arena-cleanup":
      return [
        "multiplayer",
        "shared-state",
        "terminal-transition",
      ];
    case "runtime:arena-isolation":
      return [
        "multiplayer",
        "shared-state",
      ];
    case "runtime:arena-replica-integrity":
      return [
        "replica-integrity",
        "world-mutation",
      ];
    case "runtime:state":
      return [
        "shared-state",
        "terminal-transition",
      ];
    case "runtime:chunks":
      return [
        "async",
        "external-runtime-dependency",
      ];
    case "runtime:persistence":
      return [
        "persistence",
        "reload",
        "reconnect",
      ];
    case "runtime:economy":
      return ["persistence"];
    case "runtime:combat":
      return ["multiplayer"];
    case "runtime:inventory":
      return [
        "persistence",
        "reconnect",
      ];
    case "runtime:spatial":
    case "runtime:structures":
      return ["world-mutation"];
    case "runtime:entities":
      return [
        "async",
        "external-runtime-dependency",
      ];
    case "runtime:boundaries":
      return ["capacity"];
    default:
      return capabilities.releaseBlocking > 0
        ? ["permission"]
        : [];
  }
}

export function deriveGameplayAnalysisPriorities(
  world: GameplayWorldModel,
  capabilities: CapabilityExposureSummary,
): readonly AuditRiskAssessment[] {
  const unknown = new Set(
    world.gameplayClosure.surfaces
      .filter(
        (surface) =>
          surface.status === "unknown" ||
          surface.status === "blocked",
      )
      .map((surface) => surface.id),
  );

  return world.surfaceDiscovery.surfaceIds
    .map((surfaceId) =>
      assessAuditRisk({
        surfaceId,
        factors:
          factorsForSurface(
            surfaceId,
            world,
            capabilities,
          ),
        unresolved: unknown.has(surfaceId),
      }),
    )
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.surfaceId.localeCompare(
          b.surfaceId,
        ),
    );
}
