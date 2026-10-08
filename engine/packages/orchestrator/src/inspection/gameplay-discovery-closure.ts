export type GameplayDiscoveryClosureStatus =
  | "COMPLETE"
  | "PARTIAL"
  | "OPEN";

export interface GameplayDiscoveryClosureInput {
  readonly discoveredSurfaceIds:
    readonly string[];
  readonly sourceRelevantFiles: number;
  readonly sourceIndexedFiles: number;
  readonly sourceCoverageComplete: boolean;
  readonly sourceParseFailures: number;
  readonly unsupportedRelevantSourcePaths: readonly string[];
  readonly semanticUnderstandingGapPaths: readonly string[];
  readonly unresolvedReferences: number;
  readonly discoveryChallengeIds?: readonly string[];
}

export interface GameplayDiscoveryClosure {
  readonly status:
    GameplayDiscoveryClosureStatus;
  readonly discoveredSurfaceIds:
    readonly string[];
  /**
   * Raw selected-artifact files classified as gameplay-relevant by source
   * discovery. This count is retained so later admission/review can prove that
   * discovery did not silently collapse to only successfully parsed files.
   */
  readonly sourceRelevantFiles: number;
  readonly sourceIndexedFiles: number;
  readonly sourceParseFailures: number;
  readonly unsupportedRelevantSources: number;
  readonly unsupportedRelevantSourcePaths: readonly string[];
  readonly semanticUnderstandingGaps: number;
  readonly semanticUnderstandingGapPaths: readonly string[];
  readonly sourceAccountedFiles: number;
  readonly sourceInventoryBalanced: boolean;
  readonly sourceCoverageComplete: boolean;
  readonly unresolvedReferences: number;
  readonly discoveryChallengeIds: readonly string[];
  readonly reasons: readonly string[];
}

export function assessGameplayDiscoveryClosure(
  input: GameplayDiscoveryClosureInput,
): GameplayDiscoveryClosure {
  const surfaceIds = [
    ...new Set(input.discoveredSurfaceIds),
  ].sort();
  const reasons: string[] = [];
  const discoveryChallengeIds = [
    ...new Set(input.discoveryChallengeIds ?? []),
  ].sort();
  const unsupportedRelevantSourcePaths = [
    ...new Set(input.unsupportedRelevantSourcePaths),
  ].sort();
  const unsupportedRelevantSources =
    unsupportedRelevantSourcePaths.length;
  const semanticUnderstandingGapPaths = [
    ...new Set(input.semanticUnderstandingGapPaths),
  ].sort();
  const semanticUnderstandingGaps =
    semanticUnderstandingGapPaths.length;
  const sourceAccountedFiles =
    input.sourceIndexedFiles +
    input.sourceParseFailures +
    unsupportedRelevantSources;
  const countsValid = [
    input.sourceRelevantFiles,
    input.sourceIndexedFiles,
    input.sourceParseFailures,
    input.unresolvedReferences,
  ].every((count) => Number.isSafeInteger(count) && count >= 0);
  const sourceInventoryBalanced =
    countsValid &&
    input.sourceRelevantFiles ===
      sourceAccountedFiles &&
    input.sourceIndexedFiles <=
      input.sourceRelevantFiles;

  if (!countsValid) {
    reasons.push(
      "Selected-artifact discovery counts must be non-negative safe integers.",
    );
  }
  if (surfaceIds.length === 0) {
    reasons.push(
      "No gameplay surface was discovered from the selected artifact.",
    );
  }
  if (!sourceInventoryBalanced) {
    reasons.push(
      "Relevant selected-artifact source inventory is not fully accounted: " +
        String(input.sourceRelevantFiles) +
        " relevant, " +
        String(input.sourceIndexedFiles) +
        " indexed, " +
        String(input.sourceParseFailures) +
        " parse failure(s).",
    );
  }
  if (!input.sourceCoverageComplete) {
    reasons.push(
      "Relevant selected-artifact source coverage is incomplete.",
    );
  }
  if (input.sourceParseFailures > 0) {
    reasons.push(
      String(input.sourceParseFailures) +
        " relevant source file(s) failed parsing/indexing.",
    );
  }
  if (unsupportedRelevantSources > 0) {
    reasons.push(
      String(unsupportedRelevantSources) +
        " gameplay-sensitive selected-artifact source file(s) have no semantic owner/parser and must remain a Detection Gap.",
    );
  }
  if (semanticUnderstandingGaps > 0) {
    reasons.push(
      String(semanticUnderstandingGaps) +
        " gameplay-sensitive source file(s) are structurally indexed but still lack domain semantics. Source-accounted is not semantically understood; these remain Detection Gaps.",
    );
  }

  if (discoveryChallengeIds.length > 0) {
    reasons.push(
      String(discoveryChallengeIds.length) +
      " raw execution/state evidence challenge(s) remain unaccounted.",
    );
  }

  if (input.unresolvedReferences > 0) {
    reasons.push(
      String(input.unresolvedReferences) +
        " selected-artifact reference(s) remain unresolved.",
    );
  }

  const status:
    GameplayDiscoveryClosureStatus =
      surfaceIds.length === 0 ||
      !sourceInventoryBalanced ||
      !input.sourceCoverageComplete ||
      input.sourceParseFailures > 0 ||
      unsupportedRelevantSources > 0 ||
      semanticUnderstandingGaps > 0 ||
      discoveryChallengeIds.length > 0
        ? "OPEN"
        : input.unresolvedReferences > 0
          ? "PARTIAL"
          : "COMPLETE";

  if (status === "COMPLETE") {
    reasons.push(
      "Relevant selected-artifact source inventory is balanced, all relevant sources are indexed, gameplay-sensitive indexed sources have semantic owners, and at least one gameplay surface is discovered.",
    );
  }

  return {
    status,
    discoveredSurfaceIds: surfaceIds,
    sourceRelevantFiles:
      input.sourceRelevantFiles,
    sourceIndexedFiles:
      input.sourceIndexedFiles,
    sourceParseFailures:
      input.sourceParseFailures,
    unsupportedRelevantSources,
    unsupportedRelevantSourcePaths,
    semanticUnderstandingGaps,
    semanticUnderstandingGapPaths,
    sourceAccountedFiles,
    sourceInventoryBalanced,
    sourceCoverageComplete:
      input.sourceCoverageComplete,
    unresolvedReferences:
      input.unresolvedReferences,
    discoveryChallengeIds,
    reasons,
  };
}
