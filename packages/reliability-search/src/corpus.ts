import { createHash } from "node:crypto";
import {
  coverageFeatureId,
  mergeCoverage,
  novelCoverage,
} from "./coverage.js";
import type {
  CorpusEntry,
  CoverageFeature,
  SemanticCoverageSignature,
} from "./types.js";

function stableInputId(input: unknown): string {
  return "case_" + createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex")
    .slice(0, 20);
}

export class SemanticCorpus<TInput, TFailure = unknown> {
  private readonly entries = new Map<string, CorpusEntry<TInput, TFailure>>();
  private readonly knownFeatures = new Set<string>();

  add(
    input: TInput,
    evaluation: {
      coverage: SemanticCoverageSignature;
      failed: boolean;
      failure?: TFailure;
    },
    generation: number,
    parentId?: string,
  ): CorpusEntry<TInput, TFailure> | undefined {
    const id = stableInputId(input);
    if (this.entries.has(id)) return undefined;

    const newFeatures = novelCoverage(this.knownFeatures, evaluation.coverage);
    if (newFeatures.length === 0 && !evaluation.failed) return undefined;

    const entry: CorpusEntry<TInput, TFailure> = {
      id,
      input,
      coverage: evaluation.coverage,
      newFeatures,
      failed: evaluation.failed,
      ...(evaluation.failure !== undefined ? { failure: evaluation.failure } : {}),
      generation,
      ...(parentId ? { parentId } : {}),
    };

    this.entries.set(id, entry);
    for (const feature of evaluation.coverage.features) {
      this.knownFeatures.add(coverageFeatureId(feature));
    }
    return entry;
  }

  all(): CorpusEntry<TInput, TFailure>[] {
    return [...this.entries.values()];
  }

  coverage(): SemanticCoverageSignature {
    return mergeCoverage(this.all().map((entry) => entry.coverage));
  }

  featureIds(): ReadonlySet<string> {
    return new Set(this.knownFeatures);
  }

  trim(maxEntries: number): void {
    if (this.entries.size <= maxEntries) return;

    const ranked = this.all().sort((a, b) =>
      Number(b.failed) - Number(a.failed) ||
      b.newFeatures.length - a.newFeatures.length ||
      a.generation - b.generation ||
      a.id.localeCompare(b.id),
    );

    this.entries.clear();
    this.knownFeatures.clear();
    for (const entry of ranked.slice(0, maxEntries)) {
      this.entries.set(entry.id, entry);
      for (const feature of entry.coverage.features) {
        this.knownFeatures.add(coverageFeatureId(feature));
      }
    }
  }
}

export function featureSummary(
  features: readonly CoverageFeature[],
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const feature of features) {
    result[feature.dimension] = (result[feature.dimension] ?? 0) + 1;
  }
  return result;
}
