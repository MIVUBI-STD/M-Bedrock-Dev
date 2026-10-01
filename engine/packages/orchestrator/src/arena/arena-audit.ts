import {
  compareArenaReplicas,
  type ArenaReplicaSnapshot,
} from "../../../../analyzers/topology/src/index.js";
import {
  compareSpatialFingerprints,
  type SpatialFingerprint,
} from "../../../../analyzers/world-db/src/index.js";
import {
  arenaCapacityDiagnostics,
  arenaReplicaDiagnostics,
  arenaSpatialFingerprintDiagnostics,
  packIdentityDriftDiagnostics,
  releaseIdentityConsistencyDiagnostics,
  solveArenaConcurrencyCapacity,
  type ArenaCapacityReport,
  type ArenaCapacityResource,
  type PersistedPackIdentityObservation,
  type ReleaseIdentityObservation,
} from "../../../../analyzers/diagnostics/src/index.js";
import type { DiagnosticFinding } from "../../../diagnostics/src/index.js";
import type { SourceRef } from "../../../project-model/src/index.js";
import {
  runArenaLastMileAudit,
  type ArenaLastMileAuditInput,
  type ArenaLastMileAuditResult,
} from "./arena-last-mile-audit.js";

export interface ArenaAuditInput {
  canonicalReplica?: ArenaReplicaSnapshot;
  replicaCandidates?: readonly ArenaReplicaSnapshot[];
  canonicalSpatialFingerprint?: SpatialFingerprint;
  spatialReplicaFingerprints?: readonly {
    arenaId: string;
    fingerprint: SpatialFingerprint;
  }[];
  requestedConcurrentArenas?: number;
  capacityResources?: readonly ArenaCapacityResource[];
  currentPackUuids?: readonly string[];
  persistedPackIdentities?: readonly PersistedPackIdentityObservation[];
  releaseIdentities?: readonly ReleaseIdentityObservation[];
  source?: SourceRef;
  lastMile?: ArenaLastMileAuditInput;
}

export interface ArenaAuditResult {
  findings: readonly DiagnosticFinding[];
  replicaComparisons: ReturnType<typeof compareArenaReplicas>[];
  spatialComparisons: readonly {
    arenaId: string;
    comparison: ReturnType<typeof compareSpatialFingerprints>;
  }[];
  capacity?: ArenaCapacityReport;
  lastMile?: ArenaLastMileAuditResult;
}

export function runArenaAudit(
  input: ArenaAuditInput,
): ArenaAuditResult {
  const findings: DiagnosticFinding[] = [];
  const replicaComparisons =
    input.canonicalReplica === undefined
      ? []
      : (input.replicaCandidates ?? []).map((candidate) =>
          compareArenaReplicas(input.canonicalReplica!, candidate)
        );

  for (const comparison of replicaComparisons) {
    findings.push(
      ...arenaReplicaDiagnostics(comparison, input.source),
    );
  }

  const spatialComparisons =
    input.canonicalSpatialFingerprint === undefined
      ? []
      : (input.spatialReplicaFingerprints ?? []).map((item) => ({
          arenaId: item.arenaId,
          comparison: compareSpatialFingerprints(
            input.canonicalSpatialFingerprint!,
            item.fingerprint,
          ),
        }));

  for (const item of spatialComparisons) {
    findings.push(
      ...arenaSpatialFingerprintDiagnostics(
        item.comparison,
        input.source,
      ),
    );
  }

  const capacity =
    input.requestedConcurrentArenas === undefined
      ? undefined
      : solveArenaConcurrencyCapacity(
          input.requestedConcurrentArenas,
          input.capacityResources ?? [],
        );

  if (capacity) {
    findings.push(
      ...arenaCapacityDiagnostics(capacity, input.source),
    );
  }

  if (input.currentPackUuids || input.persistedPackIdentities) {
    findings.push(
      ...packIdentityDriftDiagnostics(
        input.currentPackUuids ?? [],
        input.persistedPackIdentities ?? [],
      ),
    );
  }

  if (input.releaseIdentities) {
    findings.push(
      ...releaseIdentityConsistencyDiagnostics(
        input.releaseIdentities,
      ),
    );
  }

  const lastMile = input.lastMile === undefined
    ? undefined
    : runArenaLastMileAudit(input.lastMile);

  return {
    findings,
    replicaComparisons,
    spatialComparisons,
    ...(capacity === undefined ? {} : { capacity }),
    ...(lastMile === undefined ? {} : { lastMile }),
  };
}
