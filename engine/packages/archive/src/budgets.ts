import type { ExtractionBudget } from "./types.js";

export const NORMAL_EXTRACTION_BUDGET: Readonly<ExtractionBudget> = {
  maxFiles: 100_000,
  maxExpandedBytes: 8 * 1024 * 1024 * 1024,
  maxSingleFileBytes: 2 * 1024 * 1024 * 1024,
  maxCompressionRatio: 250,
  maxPathDepth: 32,
};

export const LARGE_WORLD_EXTRACTION_BUDGET: Readonly<ExtractionBudget> = {
  maxFiles: 500_000,
  maxExpandedBytes: 32 * 1024 * 1024 * 1024,
  maxSingleFileBytes: 8 * 1024 * 1024 * 1024,
  maxCompressionRatio: 500,
  maxPathDepth: 48,
};
