import type {
  InspectArtifactResult,
} from "../inspection/inspect-artifact.js";
import type {
  ArenaProofReuseReport,
} from "../arena/arena-proof-reuse.js";

export interface PostRepairValidationObligations {
  schemaVersion: 1;
  fullArenaProofRequired: boolean;
  repeatedRunValidationRequired: boolean;
  arenaStressValidationRequired: boolean;
  liveClientLifecycleRequired: boolean;
  globalStateLeaseRaceResources:
    readonly string[];
  reasons: readonly string[];
}

function diagnosticCodes(
  result: InspectArtifactResult,
): Set<string> {
  return new Set(
    result.diagnostics.map(
      (item) => item.code,
    ),
  );
}

function resolvedCode(
  before: Set<string>,
  after: Set<string>,
  code: string,
): boolean {
  return (
    before.has(code) &&
    !after.has(code)
  );
}

export function derivePostRepairValidationObligations(
  before: InspectArtifactResult,
  after: InspectArtifactResult,
  proofReuse: ArenaProofReuseReport,
): PostRepairValidationObligations {
  const reasons: string[] = [];
  const beforeCodes =
    diagnosticCodes(before);
  const afterCodes =
    diagnosticCodes(after);

  const physicalLayers = new Set([
    "native-spatial",
    "voxel",
    "block-entity",
    "tick-state",
    "actor-population",
    "structure-instance",
    "entity-population",
  ]);
  const physicalReuseIncomplete =
    proofReuse.assessments.some(
      (item) =>
        physicalLayers.has(item.layer) &&
        item.status !== "reusable",
    );

  const fullArenaProofRequired =
    physicalReuseIncomplete ||
    (
      before.arenaAnalysis.proofExecution
        ?.mode === "full" &&
      after.arenaAnalysis.proofExecution
        ?.mode !== "full" &&
      proofReuse.blockedLayers.length > 0
    );

  if (fullArenaProofRequired) {
    reasons.push(
      "One or more physical arena proof dependencies changed or could not be reused safely; rerun full arena proof before release.",
    );
  }

  const cleanupImproved =
    (
      before.arenaAnalysis.cleanupSurfaces
        ?.unresolved ?? 0
    ) >
    (
      after.arenaAnalysis.cleanupSurfaces
        ?.unresolved ?? 0
    );
  const lifecycleImproved =
    (
      before.arenaAnalysis.lifecycle
        ?.unresolved ?? 0
    ) >
    (
      after.arenaAnalysis.lifecycle
        ?.unresolved ?? 0
    );

  const repeatedRunValidationRequired =
    cleanupImproved ||
    lifecycleImproved ||
    resolvedCode(
      beforeCodes,
      afterCodes,
      "CROSS_SCOPE_STATE_RISK",
    );

  if (repeatedRunValidationRequired) {
    reasons.push(
      "Repair changed cleanup/lifecycle/state-isolation evidence; repeated 1/2/5/20 cycle validation is required to prove no cumulative residue.",
    );
  }

  const globalStateLeaseRaceResources = [
    ...new Set(
      (
        after.arenaAnalysis.globalState
          ?.assessments ?? []
      )
        .filter(
          (item) =>
            item.status ===
              "paired-lease-evidence" &&
            item.audited,
        )
        .map(
          (item) => item.resource,
        ),
    ),
  ].sort();

  const globalStateRepair =
    resolvedCode(
      beforeCodes,
      afterCodes,
      "WORLDSTATE_GLOBAL_LEASE_MISSING",
    ) ||
    resolvedCode(
      beforeCodes,
      afterCodes,
      "WORLDSTATE_GLOBAL_MUTATION_NOT_AUDITED",
    );

  if (
    globalStateRepair &&
    globalStateLeaseRaceResources.length > 0
  ) {
    reasons.push(
      "World-global lease/audit defect was repaired; run stale-owner lease races for the repaired resource set.",
    );
  }

  const arenaStressValidationRequired =
    before.arenaAnalysis.repairBridge
      ?.deterministicRepairs !==
      after.arenaAnalysis.repairBridge
        ?.deterministicRepairs ||
    resolvedCode(
      beforeCodes,
      afterCodes,
      "ARENA_CONCURRENCY_CAPACITY_SHORTFALL",
    ) ||
    after.arenaAnalysis.stateIsolation
      ?.partitionProofRequired !==
      before.arenaAnalysis.stateIsolation
        ?.partitionProofRequired;

  if (arenaStressValidationRequired) {
    reasons.push(
      "Repair changed arena capacity/repair/isolation conditions; rerun deterministic multi-arena stress scenarios.",
    );
  }

  const liveClientLifecycleRequired =
    after.arenaAnalysis.stressPlan
      ?.matrix?.scenarios.some(
        (scenario) =>
          scenario.kind ===
            "disconnect-during-setup" ||
          scenario.kind ===
            "disconnect-during-active" ||
          scenario.kind ===
            "reconnect-after-disconnect",
      ) ?? false;

  if (liveClientLifecycleRequired) {
    reasons.push(
      "Disconnect/reconnect scenarios remain part of the validation matrix; true network lifecycle proof requires an external live-client adapter.",
    );
  }

  return {
    schemaVersion: 1,
    fullArenaProofRequired,
    repeatedRunValidationRequired,
    arenaStressValidationRequired,
    liveClientLifecycleRequired,
    globalStateLeaseRaceResources:
      globalStateRepair
        ? globalStateLeaseRaceResources
        : [],
    reasons,
  };
}
