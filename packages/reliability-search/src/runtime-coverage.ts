import type {
  RuntimeComparisonResult,
  RuntimeObservationSnapshot,
} from "../../reliability/src/index.js";
import { normalizeCoverage } from "./coverage.js";
import type { CoverageFeature, SemanticCoverageSignature } from "./types.js";

function stableSubject(parts: Array<string | undefined>): string {
  return parts.filter((part): part is string => Boolean(part)).join(":");
}

export function runtimeDivergenceCoverage(
  comparison: RuntimeComparisonResult,
  snapshot?: RuntimeObservationSnapshot,
): SemanticCoverageSignature {
  const features: CoverageFeature[] = [];

  for (const divergence of comparison.divergences) {
    features.push({
      dimension: "divergence",
      key: stableSubject([
        divergence.kind,
        divergence.playerId ? `player=${divergence.playerId}` : undefined,
        divergence.arenaId ? `arena=${divergence.arenaId}` : undefined,
      ]),
    });
  }

  for (const violation of comparison.invariantViolations) {
    features.push({
      dimension: "invariant",
      key: violation.invariantId,
    });
  }

  for (const unknown of comparison.unknowns) {
    features.push({
      dimension: "divergence",
      key: `unknown:${unknown}`,
    });
  }

  if (snapshot?.entities) {
    const byType = new Map<string, number>();
    for (const entity of snapshot.entities) {
      byType.set(entity.typeId, (byType.get(entity.typeId) ?? 0) + 1);
    }
    for (const [typeId, count] of [...byType.entries()].sort()) {
      features.push({
        dimension: "interaction",
        key: `entity-count:${typeId}:${count}`,
      });
    }
  }

  return normalizeCoverage(features);
}
