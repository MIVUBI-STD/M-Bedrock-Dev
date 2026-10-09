import type {
  InspectArtifactResult,
} from "../inspection/inspect-artifact.js";

export interface ArenaRuntimeAdapterRequirements {
  schemaVersion: 1;
  requiredHooks: readonly string[];
  requiredBaselineSurfaces: readonly string[];
  requiredGlobalResources: readonly string[];
  liveClientLifecycleRequired: boolean;
  reasons: readonly string[];
}

export function deriveArenaRuntimeAdapterRequirements(
  result: InspectArtifactResult,
): ArenaRuntimeAdapterRequirements {
  const arena = result.arenaAnalysis;
  const hooks = new Set<string>();
  const surfaces = new Set<string>();
  const resources = new Set<string>();
  const reasons: string[] = [];

  if (
    arena.spatialLayout &&
    arena.stressPlan?.status === "planned"
  ) {
    for (const hook of [
      "resetArena",
      "startArena",
      "finishArena",
      "staggeredJoin",
    ]) {
      hooks.add(hook);
    }
    reasons.push(
      "Arena stress planning is available, so the runtime adapter must drive real authored reset/start/finish/join behavior.",
    );
  }

  if (arena.repeatedRunPlan) {
    hooks.add("captureArenaBaseline");
    hooks.add("compareArenaBaseline");
    hooks.add("executeArenaCycle");

    for (
      const stage of
        arena.repeatedRunPlan.stages
    ) {
      for (
        const surface of
          stage.compareSurfaces
      ) {
        surfaces.add(surface);
      }
    }
    reasons.push(
      "Repeated-run validation requires baseline capture and comparison for every declared residue surface.",
    );
  }

  const disconnectScenario =
    arena.stressPlan?.matrix?.scenarios.some(
      (scenario) =>
        scenario.kind ===
          "disconnect-during-setup" ||
        scenario.kind ===
          "disconnect-during-active" ||
        scenario.kind ===
          "reconnect-after-disconnect",
    ) ?? false;

  if (disconnectScenario) {
    hooks.add("disconnectPlayer");
    reasons.push(
      "Disconnect/reconnect stress scenarios exist. Server-only adapters may simulate state transitions, but real client lifecycle proof requires an external client controller.",
    );
  }

  for (
    const mutation of
      arena.globalState?.mutations ?? []
  ) {
    if (mutation.arenaScoped) {
      resources.add(mutation.resource);
    }
  }

  if (resources.size > 0) {
    reasons.push(
      "Arena-owned world-global resources require generation-scoped acquire/cleanup/restore runtime hooks.",
    );
  }

  if (
    arena.cleanupSurfaces?.acquiredSurfaces
  ) {
    reasons.push(
      "Cleanup ownership evidence exists; the adapter should expose residue observations rather than only action acknowledgements.",
    );
  }

  return {
    schemaVersion: 1,
    requiredHooks:
      [...hooks].sort(),
    requiredBaselineSurfaces:
      [...surfaces].sort(),
    requiredGlobalResources:
      [...resources].sort(),
    liveClientLifecycleRequired:
      disconnectScenario,
    reasons,
  };
}
