import { createHash } from "node:crypto";
import type {
  InspectArtifactResult,
} from "./inspect-artifact.js";

export type ArenaProofReuseLayer =
  | "native-spatial"
  | "voxel"
  | "block-entity"
  | "tick-state"
  | "actor-population"
  | "structure-instance"
  | "entity-population";

export interface ArenaProofReuseAssessment {
  layer: ArenaProofReuseLayer;
  status: "reusable" | "stale" | "blocked";
  reason: string;
}

export interface ArenaProofReuseReport {
  schemaVersion: 1;
  assessments:
    readonly ArenaProofReuseAssessment[];
  reusableLayers:
    readonly ArenaProofReuseLayer[];
  staleLayers:
    readonly ArenaProofReuseLayer[];
  blockedLayers:
    readonly ArenaProofReuseLayer[];
}

function canonical(
  value: unknown,
): unknown {
  if (Array.isArray(value)) {
    return value.map(canonical);
  }
  if (
    value !== null &&
    typeof value === "object"
  ) {
    return Object.fromEntries(
      Object.entries(
        value as Record<string, unknown>,
      )
        .sort(([a], [b]) =>
          a.localeCompare(b)
        )
        .map(([key, child]) => [
          key,
          canonical(child),
        ]),
    );
  }
  return value;
}

function hash(
  value: unknown,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify(
        canonical(value),
      ),
    )
    .digest("hex");
}

function layoutFingerprint(
  result: InspectArtifactResult,
): string {
  return hash({
    layout:
      result.arenaAnalysis.spatialLayout ??
      null,
    regionPlan:
      result.arenaAnalysis.regionPlan ??
      null,
    regionClassification:
      result.arenaAnalysis
        .regionClassification ?? null,
    proofPartition:
      result.arenaAnalysis
        .proofPartition ?? null,
  });
}

function completeWorldDbFingerprint(
  result: InspectArtifactResult,
):
  | {
      complete: true;
      fingerprint: string;
    }
  | {
      complete: false;
      reason: string;
    } {
  const scan =
    result.worldDatabase.nativeScan;
  if (!scan || scan.status !== "scanned") {
    return {
      complete: false,
      reason:
        "Native world DB scan is unavailable.",
    };
  }
  if (
    scan.truncated ||
    scan.chunkSignalsTruncated ||
    scan.chunkContentObservationsTruncated
  ) {
    return {
      complete: false,
      reason:
        "Native world DB evidence is truncated, so physical proof reuse cannot be authorized.",
    };
  }
  if (!scan.chunkContentObservations) {
    return {
      complete: false,
      reason:
        "Hashed native chunk content observations are unavailable.",
    };
  }

  return {
    complete: true,
    fingerprint: hash({
      observations:
        scan.chunkContentObservations,
      blockEntityRecords:
        scan.blockEntityRecords,
      pendingTickRecords:
        scan.pendingTickRecords,
      randomTickRecords:
        scan.randomTickRecords,
      finalizedStateRecords:
        scan.finalizedStateRecords,
      subChunkRecords:
        scan.subChunkRecords,
    }),
  };
}

function structureFingerprint(
  result: InspectArtifactResult,
): string {
  return hash({
    commandPlacements:
      result.structureRuntime
        .structurePlacements,
    scriptPlacements:
      result.scriptSpatial
        .structurePlacements,
  });
}

function authoredEntityFingerprint(
  result: InspectArtifactResult,
): string {
  return hash(
    result.arenaAnalysis
      .entitySpawnEvidence ?? [],
  );
}

function physicalAssessment(
  layer: ArenaProofReuseLayer,
  before: InspectArtifactResult,
  after: InspectArtifactResult,
): ArenaProofReuseAssessment {
  if (
    layoutFingerprint(before) !==
    layoutFingerprint(after)
  ) {
    return {
      layer,
      status: "stale",
      reason:
        "Arena layout/region dependency changed.",
    };
  }

  const left =
    completeWorldDbFingerprint(before);
  const right =
    completeWorldDbFingerprint(after);

  if (!left.complete) {
    return {
      layer,
      status: "blocked",
      reason: left.reason,
    };
  }
  if (!right.complete) {
    return {
      layer,
      status: "blocked",
      reason: right.reason,
    };
  }

  return left.fingerprint === right.fingerprint
    ? {
        layer,
        status: "reusable",
        reason:
          "Arena layout and complete hashed world DB dependencies are unchanged.",
      }
    : {
        layer,
        status: "stale",
        reason:
          "Hashed world DB dependency changed.",
      };
}

export function assessArenaProofReuse(
  before: InspectArtifactResult,
  after: InspectArtifactResult,
): ArenaProofReuseReport {
  const assessments:
    ArenaProofReuseAssessment[] = [
      physicalAssessment(
        "native-spatial",
        before,
        after,
      ),
      physicalAssessment(
        "voxel",
        before,
        after,
      ),
      physicalAssessment(
        "block-entity",
        before,
        after,
      ),
      physicalAssessment(
        "tick-state",
        before,
        after,
      ),
    ];

  assessments.push(
    layoutFingerprint(before) ===
      layoutFingerprint(after) &&
    structureFingerprint(before) ===
      structureFingerprint(after)
      ? {
          layer: "structure-instance",
          status: "reusable",
          reason:
            "Arena layout and authored structure placement dependencies are unchanged.",
        }
      : {
          layer: "structure-instance",
          status: "stale",
          reason:
            "Arena layout or authored structure placement dependency changed.",
        },
  );

  assessments.push(
    layoutFingerprint(before) ===
      layoutFingerprint(after) &&
    authoredEntityFingerprint(before) ===
      authoredEntityFingerprint(after)
      ? {
          layer: "entity-population",
          status: "reusable",
          reason:
            "Arena layout and authored entity-spawn dependencies are unchanged.",
        }
      : {
          layer: "entity-population",
          status: "stale",
          reason:
            "Arena layout or authored entity-spawn dependency changed.",
        },
  );

  const beforeActors =
    before.worldDatabase.nativeScan
      ?.actorRecords ?? 0;
  const afterActors =
    after.worldDatabase.nativeScan
      ?.actorRecords ?? 0;

  if (
    beforeActors === 0 &&
    afterActors === 0 &&
    layoutFingerprint(before) ===
      layoutFingerprint(after)
  ) {
    assessments.push({
      layer: "actor-population",
      status: "reusable",
      reason:
        "Both snapshots contain zero Actor records and arena layout is unchanged.",
    });
  } else if (
    before.fingerprint ===
    after.fingerprint
  ) {
    assessments.push({
      layer: "actor-population",
      status: "reusable",
      reason:
        "Artifact fingerprint is identical, so Actor DB content is unchanged.",
    });
  } else {
    assessments.push({
      layer: "actor-population",
      status: "blocked",
      reason:
        "Actor record values are not yet stored as reusable hashed dependencies; changed artifacts require fresh Actor DB proof.",
    });
  }

  return {
    schemaVersion: 1,
    assessments,
    reusableLayers:
      assessments
        .filter(
          (item) =>
            item.status === "reusable",
        )
        .map((item) => item.layer),
    staleLayers:
      assessments
        .filter(
          (item) =>
            item.status === "stale",
        )
        .map((item) => item.layer),
    blockedLayers:
      assessments
        .filter(
          (item) =>
            item.status === "blocked",
        )
        .map((item) => item.layer),
  };
}
