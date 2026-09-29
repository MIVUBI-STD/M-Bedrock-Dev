import type {
  ConfirmedDefectSourceEvidence,
} from "../../bug-report/src/index.js";
import type {
  SourceRef,
} from "../../project-model/src/index.js";
import type {
  ExecutionRegion,
  SemanticIr,
} from "../../semantic-ir/src/index.js";

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

export function resolveSourceSemanticOwner(
  source: SourceRef,
  semanticIr: SemanticIr,
): string | undefined {
  const ranked = semanticIr.execution.regions
    .map((region) => ({
      region,
      rank: regionMatchRank(source, region),
    }))
    .filter((item) => item.rank > 0);

  if (ranked.length === 0) return undefined;

  const bestRank = Math.max(
    ...ranked.map((item) => item.rank),
  );
  const best = ranked
    .filter((item) => item.rank === bestRank)
    .sort((a, b) =>
      a.region.id.localeCompare(b.region.id)
    );

  if (best.length !== 1) {
    return undefined;
  }

  return best[0]!.region.id;
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
