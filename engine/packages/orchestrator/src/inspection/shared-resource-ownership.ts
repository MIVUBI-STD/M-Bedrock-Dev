import type {
  SemanticIr,
} from "../../../semantic-ir/src/index.js";

export interface SharedResourceOwnershipRecord {
  readonly surfaceId: string;
  readonly readerRegionIds: readonly string[];
  readonly writerRegionIds: readonly string[];
  readonly clearerRegionIds: readonly string[];
  readonly deferredWriterRegionIds: readonly string[];
  readonly authorityBound: boolean;
  readonly highOrderInteraction: boolean;
  readonly evidenceIds: readonly string[];
}

export interface SharedResourceOwnershipSignal {
  readonly id: string;
  readonly kind:
    | "multi-writer-without-authority"
    | "deferred-writer-without-generation-proof"
    | "higher-order-shared-resource";
  readonly surfaceId: string;
  readonly regionIds: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly reason: string;
}

function temporalByRegion(
  ir: SemanticIr,
): ReadonlyMap<string, readonly SemanticIr["temporal"]["relations"][number][]> {
  const byRegion = new Map<string, SemanticIr["temporal"]["relations"][number][]>();
  for (const relation of ir.temporal.relations) {
    byRegion.set(
      relation.from,
      [...(byRegion.get(relation.from) ?? []), relation],
    );
  }
  return byRegion;
}

/**
 * Reverse resource index: resource -> every reader/writer/clearer/deferred
 * writer. This exposes bugs that are healthy inside each subsystem but broken
 * when several owners converge on the same state.
 */
export function analyzeSharedResourceOwnership(
  ir: SemanticIr,
): {
  readonly records: readonly SharedResourceOwnershipRecord[];
  readonly signals: readonly SharedResourceOwnershipSignal[];
} {
  const bySurface = new Map<
    string,
    {
      readers: Set<string>;
      writers: Set<string>;
      clearers: Set<string>;
      evidence: Set<string>;
    }
  >();

  for (const operation of ir.state.operations) {
    const current = bySurface.get(operation.surfaceId) ?? {
      readers: new Set<string>(),
      writers: new Set<string>(),
      clearers: new Set<string>(),
      evidence: new Set<string>(),
    };
    if (
      operation.operation === "read" ||
      operation.operation === "enumerate" ||
      operation.operation === "size"
    ) {
      current.readers.add(operation.executionRegionId);
    }
    if (
      operation.operation === "write" ||
      operation.operation === "delete"
    ) {
      current.writers.add(operation.executionRegionId);
    }
    if (
      operation.operation === "clear" ||
      operation.operation === "delete"
    ) {
      current.clearers.add(operation.executionRegionId);
    }
    current.evidence.add(operation.id);
    bySurface.set(operation.surfaceId, current);
  }

  const temporal = temporalByRegion(ir);
  const authoritySurfaces = new Set(
    ir.state.authorityBindings.map(
      (binding) => binding.authoritySurfaceId,
    ),
  );

  const records: SharedResourceOwnershipRecord[] = [];
  const signals: SharedResourceOwnershipSignal[] = [];

  for (const [surfaceId, state] of bySurface) {
    const deferredWriters = [...state.writers].filter(
      (regionId) =>
        (temporal.get(regionId) ?? []).some(
          (relation) =>
            (
              relation.kind === "deferred" ||
              relation.kind === "periodic"
            ) &&
            relation.guardEvidence !==
              "explicit-generation-check",
        ),
    );
    const allRegions = new Set([
      ...state.readers,
      ...state.writers,
      ...state.clearers,
    ]);
    const authorityBound = authoritySurfaces.has(surfaceId);
    const highOrderInteraction =
      allRegions.size >= 3 &&
      state.writers.size >= 2;

    const record: SharedResourceOwnershipRecord = {
      surfaceId,
      readerRegionIds: [...state.readers].sort(),
      writerRegionIds: [...state.writers].sort(),
      clearerRegionIds: [...state.clearers].sort(),
      deferredWriterRegionIds: deferredWriters.sort(),
      authorityBound,
      highOrderInteraction,
      evidenceIds: [...state.evidence].sort(),
    };
    records.push(record);

    if (state.writers.size > 1 && !authorityBound) {
      signals.push({
        id: "shared-resource:multi-writer:" + surfaceId,
        kind: "multi-writer-without-authority",
        surfaceId,
        regionIds: [...state.writers].sort(),
        evidenceIds: record.evidenceIds,
        reason:
          "Multiple execution regions can write the same state surface without an explicit authority binding. Mutual exclusion, generation scope, and lifecycle ownership require proof.",
      });
    }

    if (deferredWriters.length > 0) {
      signals.push({
        id: "shared-resource:deferred-writer:" + surfaceId,
        kind: "deferred-writer-without-generation-proof",
        surfaceId,
        regionIds: deferredWriters.sort(),
        evidenceIds: record.evidenceIds,
        reason:
          "A writer participating in deferred/periodic work can mutate this shared resource without explicit generation proof at the temporal relation.",
      });
    }

    if (highOrderInteraction) {
      signals.push({
        id: "shared-resource:higher-order:" + surfaceId,
        kind: "higher-order-shared-resource",
        surfaceId,
        regionIds: [...allRegions].sort(),
        evidenceIds: record.evidenceIds,
        reason:
          "Three or more execution regions converge on one shared resource with multiple writers. Explore interleavings around lifecycle boundaries instead of only pairwise subsystem checks.",
      });
    }
  }

  return {
    records: records.sort((a, b) =>
      a.surfaceId.localeCompare(b.surfaceId)
    ),
    signals: signals.sort((a, b) =>
      a.id.localeCompare(b.id)
    ),
  };
}
