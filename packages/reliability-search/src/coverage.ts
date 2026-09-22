import { createHash } from "node:crypto";
import type {
  CoverageFeature,
  SemanticCoverageSignature,
} from "./types.js";

export function coverageFeatureId(feature: CoverageFeature): string {
  return `${feature.dimension}:${feature.key}`;
}

export function normalizeCoverage(
  features: readonly CoverageFeature[],
): SemanticCoverageSignature {
  const byId = new Map<string, CoverageFeature>();
  for (const feature of features) {
    byId.set(coverageFeatureId(feature), feature);
  }

  return {
    features: [...byId.values()].sort((a, b) =>
      coverageFeatureId(a).localeCompare(coverageFeatureId(b)),
    ),
  };
}

export function mergeCoverage(
  signatures: readonly SemanticCoverageSignature[],
): SemanticCoverageSignature {
  return normalizeCoverage(signatures.flatMap((item) => item.features));
}

export function novelCoverage(
  known: ReadonlySet<string>,
  signature: SemanticCoverageSignature,
): CoverageFeature[] {
  return signature.features.filter((feature) => !known.has(coverageFeatureId(feature)));
}

export function coverageIdentity(
  signature: SemanticCoverageSignature,
): string {
  return "cov_" + createHash("sha256")
    .update(JSON.stringify(normalizeCoverage(signature.features)))
    .digest("hex")
    .slice(0, 20);
}
