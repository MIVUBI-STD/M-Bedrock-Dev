export type GameplayDiscoveryClosureStatus =
  | "COMPLETE"
  | "PARTIAL"
  | "OPEN";

export interface GameplayDiscoveryClosureInput {
  readonly discoveredSurfaceIds:
    readonly string[];
  readonly sourceCoverageComplete: boolean;
  readonly sourceParseFailures: number;
  readonly unresolvedReferences: number;
}

export interface GameplayDiscoveryClosure {
  readonly status:
    GameplayDiscoveryClosureStatus;
  readonly discoveredSurfaceIds:
    readonly string[];
  readonly sourceCoverageComplete: boolean;
  readonly sourceParseFailures: number;
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

  if (surfaceIds.length === 0) {
    reasons.push(
      "No gameplay surface was discovered from the selected artifact.",
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
  if (input.unresolvedReferences > 0) {
    reasons.push(
      String(input.unresolvedReferences) +
        " selected-artifact reference(s) remain unresolved.",
    );
  }

  const status:
    GameplayDiscoveryClosureStatus =
      surfaceIds.length === 0 ||
      !input.sourceCoverageComplete ||
      input.sourceParseFailures > 0
        ? "OPEN"
        : input.unresolvedReferences > 0
          ? "PARTIAL"
          : "COMPLETE";

  if (status === "COMPLETE") {
    reasons.push(
      "Relevant selected-artifact sources are indexed and at least one gameplay surface is discovered.",
    );
  }

  return {
    status,
    discoveredSurfaceIds: surfaceIds,
    sourceCoverageComplete:
      input.sourceCoverageComplete,
    sourceParseFailures:
      input.sourceParseFailures,
    unresolvedReferences:
      input.unresolvedReferences,
    reasons,
  };
}
