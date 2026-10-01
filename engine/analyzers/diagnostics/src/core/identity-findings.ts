import {
  createDiagnostic,
  type DiagnosticFinding,
} from "../../../../packages/diagnostics/src/index.js";
import type { SourceRef } from "../../../../packages/project-model/src/index.js";

export interface PersistedPackIdentityObservation {
  identity: string;
  source?: SourceRef;
  namespace?: string;
}

export function packIdentityDriftDiagnostics(
  currentPackUuids: readonly string[],
  persisted: readonly PersistedPackIdentityObservation[],
): DiagnosticFinding[] {
  const active = new Set(
    currentPackUuids.map((value) => value.toLowerCase()),
  );

  return persisted
    .filter((item) => !active.has(item.identity.toLowerCase()))
    .map((item) =>
      createDiagnostic({
        code: "PACK_IDENTITY_DRIFT",
        severity: "critical",
        message:
          `Persisted world state references pack identity ${item.identity}, but that identity is not present in the current manifest set.`,
        ...(item.source === undefined ? {} : { source: item.source }),
        data: {
          persistedIdentity: item.identity,
          ...(item.namespace === undefined
            ? {}
            : { namespace: item.namespace }),
          currentPackUuids: [...currentPackUuids],
        },
      })
    );
}

export interface ReleaseIdentityObservation {
  component: string;
  releaseVersion: string;
  source?: SourceRef;
}

export function releaseIdentityConsistencyDiagnostics(
  observations: readonly ReleaseIdentityObservation[],
): DiagnosticFinding[] {
  const normalized = observations.filter(
    (item) => item.releaseVersion.trim().length > 0,
  );
  const versions = new Set(
    normalized.map((item) => item.releaseVersion.trim()),
  );
  if (versions.size <= 1) return [];

  return normalized.map((item) =>
    createDiagnostic({
      code: "RELEASE_IDENTITY_INCONSISTENT",
      severity: "medium",
      message:
        `Release identity ${item.releaseVersion} for ${item.component} disagrees with the artifact release set.`,
      ...(item.source === undefined ? {} : { source: item.source }),
      data: {
        component: item.component,
        releaseVersion: item.releaseVersion,
        observedReleaseVersions: [...versions].sort(),
      },
    })
  );
}
