import type {
  ConfirmedDefectSourceEvidence,
} from "../../../bug-report/src/index.js";
import type {
  SourceRef,
} from "../../../project-model/src/index.js";
import type {
  ExecutionRegion,
  SemanticIr,
} from "../../../semantic-ir/src/index.js";

function normalizedPath(value: string): string {
  return value.replaceAll("\\", "/");
}

function rangeContains(
  outer: SourceRef["range"],
  inner: SourceRef["range"],
): boolean {
  if (
    outer?.lineStart === undefined ||
    outer.lineEnd === undefined ||
    inner?.lineStart === undefined ||
    inner.lineEnd === undefined
  ) {
    return false;
  }

  return (
    outer.lineStart <= inner.lineStart &&
    outer.lineEnd >= inner.lineEnd
  );
}

function rangeOverlaps(
  left: SourceRef["range"],
  right: SourceRef["range"],
): boolean {
  if (
    left?.lineStart === undefined ||
    left.lineEnd === undefined ||
    right?.lineStart === undefined ||
    right.lineEnd === undefined
  ) {
    return false;
  }

  return (
    left.lineStart <= right.lineEnd &&
    right.lineStart <= left.lineEnd
  );
}

function regionMatchRank(
  evidence: SourceRef,
  region: ExecutionRegion,
): number {
  const source = region.source;
  if (!source) return 0;
  if (
    normalizedPath(source.relativePath) !==
    normalizedPath(evidence.relativePath)
  ) {
    return 0;
  }

  if (
    source.jsonPointer !== undefined &&
    evidence.jsonPointer !== undefined &&
    source.jsonPointer === evidence.jsonPointer
  ) {
    return 4;
  }

  if (rangeContains(source.range, evidence.range)) {
    return 3;
  }

  if (rangeContains(evidence.range, source.range)) {
    return 2;
  }

  if (rangeOverlaps(source.range, evidence.range)) {
    return 1;
  }

  return 0;
}

interface SemanticOwnerCandidate {
  readonly ownerId: string;
  readonly score: number;
}

function sourceMatchRank(
  evidence: SourceRef,
  source: SourceRef | undefined,
): number {
  if (!source) return 0;

  return regionMatchRank(
    evidence,
    {
      id: "source-match",
      kind: "script-module",
      ownerId: "source-match",
      label: "source-match",
      source,
    },
  );
}

function bestOwner(
  candidates: readonly SemanticOwnerCandidate[],
): string | undefined {
  if (candidates.length === 0) {
    return undefined;
  }

  const byOwner = new Map<string, number>();
  for (const candidate of candidates) {
    byOwner.set(
      candidate.ownerId,
      Math.max(
        byOwner.get(candidate.ownerId) ?? 0,
        candidate.score,
      ),
    );
  }

  const ranked = [...byOwner.entries()]
    .map(([ownerId, score]) => ({
      ownerId,
      score,
    }))
    .sort((a, b) =>
      b.score - a.score ||
      a.ownerId.localeCompare(b.ownerId)
    );

  if (
    ranked.length > 1 &&
    ranked[0]!.score === ranked[1]!.score
  ) {
    return undefined;
  }

  return ranked[0]!.ownerId;
}

export function resolveSourceSemanticOwner(
  source: SourceRef,
  semanticIr: SemanticIr,
): string | undefined {
  const candidates: SemanticOwnerCandidate[] = [];

  for (const operation of semanticIr.state.operations) {
    const rank = sourceMatchRank(
      source,
      operation.source,
    );
    if (rank > 0) {
      candidates.push({
        ownerId: operation.executionRegionId,
        score: 40 + rank,
      });
    }
  }

  for (const edge of semanticIr.execution.edges) {
    const rank = sourceMatchRank(
      source,
      edge.source,
    );
    if (rank > 0) {
      candidates.push({
        ownerId: edge.from,
        score: 30 + rank,
      });
    }
  }

  for (const relation of semanticIr.temporal.relations) {
    const rank = sourceMatchRank(
      source,
      relation.source,
    );
    if (rank > 0) {
      candidates.push({
        ownerId: relation.from,
        score: 20 + rank,
      });
    }
  }

  for (const region of semanticIr.execution.regions) {
    const rank = regionMatchRank(source, region);
    if (rank > 0) {
      candidates.push({
        ownerId: region.id,
        score: 10 + rank,
      });
    }
  }

  return bestOwner(candidates);
}

export function bindSourceEvidenceSemanticOwners(
  evidence:
    readonly ConfirmedDefectSourceEvidence[] | undefined,
  semanticIr: SemanticIr | undefined,
): readonly ConfirmedDefectSourceEvidence[] | undefined {
  if (!evidence || evidence.length === 0) {
    return evidence;
  }
  if (!semanticIr) return evidence;

  return evidence.map((item) => {
    if (item.semanticOwnerId !== undefined) {
      return item;
    }

    const semanticOwnerId =
      resolveSourceSemanticOwner(
        item.source,
        semanticIr,
      );

    return semanticOwnerId === undefined
      ? item
      : {
          ...item,
          semanticOwnerId,
        };
  });
}
