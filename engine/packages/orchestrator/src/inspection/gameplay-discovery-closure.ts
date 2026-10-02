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
  readonly unsupportedRelevantSources: number;
  readonly unresolvedReferences: number;
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
  readonly sourceAccountedFiles: number;
  readonly sourceInventoryBalanced: boolean;
  readonly sourceCoverageComplete: boolean;
  readonly unresolvedReferences: number;
  readonly reasons: readonly string[];
}

export function assessGameplayDiscoveryClosure(
  input: GameplayDiscoveryClosureInput,
): GameplayDiscoveryClosure {
  const surfaceIds = [
    ...new Set(input.discoveredSurfaceIds),
  ].sort();
  const reasons: string[] = [];
  const sourceAccountedFiles =
    input.sourceIndexedFiles +
    input.sourceParseFailures +
    input.unsupportedRelevantSources;
  const sourceInventoryBalanced =
    input.sourceRelevantFiles ===
      sourceAccountedFiles &&
    input.sourceIndexedFiles <=
      input.sourceRelevantFiles;

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
  if (input.unsupportedRelevantSources > 0) {
    reasons.push(
      String(input.unsupportedRelevantSources) +
        " gameplay-sensitive selected-artifact source file(s) have no semantic owner/parser and must remain a Detection Gap.",
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
      input.unsupportedRelevantSources > 0
        ? "OPEN"
        : input.unresolvedReferences > 0
          ? "PARTIAL"
          : "COMPLETE";

  if (status === "COMPLETE") {
    reasons.push(
      "Relevant selected-artifact source inventory is balanced, all relevant sources are indexed, and at least one gameplay surface is discovered.",
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
    unsupportedRelevantSources:
      input.unsupportedRelevantSources,
    sourceAccountedFiles,
    sourceInventoryBalanced,
    sourceCoverageComplete:
      input.sourceCoverageComplete,
    unresolvedReferences:
      input.unresolvedReferences,
    reasons,
  };
}
