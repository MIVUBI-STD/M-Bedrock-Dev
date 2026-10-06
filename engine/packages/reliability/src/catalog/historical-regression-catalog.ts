import type {
  HistoricalRegressionCatalog,
  HistoricalRegressionCatalogEntry,
  RegressionCase,
} from "../core/types.js";

function slug(value: string): string {
  const clean = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return clean || "unknown";
}

export function historicalRegressionId(input: {
  readonly mapName: string;
  readonly mapVersion: string;
  readonly bugId: string;
}): string {
  return (
    "reg_" +
    slug(input.mapName) +
    "_" +
    slug(input.mapVersion) +
    "_" +
    slug(input.bugId)
  );
}

function sameMeaning(
  left: HistoricalRegressionCatalogEntry,
  right: RegressionCase,
): boolean {
  const expected =
    typeof left.expected === "string"
      ? left.expected
      : undefined;
  const observed =
    typeof left.observed === "string"
      ? left.observed
      : undefined;
  const provenance =
    left.provenance !== null &&
    typeof left.provenance === "object" &&
    !Array.isArray(left.provenance)
      ? left.provenance as Record<string, unknown>
      : undefined;

  if (
    expected !== undefined &&
    expected !== right.expected
  ) {
    return false;
  }
  if (
    observed !== undefined &&
    observed !== right.observed
  ) {
    return false;
  }
  if (
    provenance !== undefined &&
    provenance.source ===
      "Canonical Bug Report V2" &&
    right.provenance?.source ===
      "Canonical Bug Report V2"
  ) {
    return (
      provenance.map ===
        right.provenance.map &&
      provenance.mapVersion ===
        right.provenance.mapVersion &&
      provenance.bugId ===
        right.provenance.bugId
    );
  }

  // Legacy entries may not carry the newer provenance fields.
  // Preserve them when the stable id/known Expected/Observed do not conflict.
  return true;
}

export function mergeHistoricalRegressionCatalog(
  catalog: HistoricalRegressionCatalog,
  incoming:
    readonly RegressionCase[],
): HistoricalRegressionCatalog {
  if (catalog.schemaVersion !== 1) {
    throw new Error(
      "Unsupported historical regression catalog schemaVersion.",
    );
  }

  const byId =
    new Map<string, HistoricalRegressionCatalogEntry>(
      catalog.regressions.map(
        (item) => [item.id, item] as const,
      ),
    );
  const byCanonicalIssueId =
    new Map<string, string>();
  for (const item of catalog.regressions) {
    if (item.canonicalIssueId?.trim()) {
      const previous =
        byCanonicalIssueId.get(
          item.canonicalIssueId,
        );
      if (
        previous !== undefined &&
        previous !== item.id
      ) {
        throw new Error(
          "Historical catalog contains duplicate canonicalIssueId: " +
            item.canonicalIssueId +
            ".",
        );
      }
      byCanonicalIssueId.set(
        item.canonicalIssueId,
        item.id,
      );
    }
  }

  for (const item of incoming) {
    const canonicalIssueId =
      item.canonicalIssueId ??
      item.id;
    const mappedId =
      byCanonicalIssueId.get(
        canonicalIssueId,
      );
    const storageId =
      mappedId ??
      item.id;
    const previous =
      byId.get(storageId);
    const explicitLegacyMapping =
      previous !== undefined &&
      storageId !== item.id &&
      previous.canonicalIssueId ===
        canonicalIssueId;

    if (
      previous !== undefined &&
      !explicitLegacyMapping &&
      !sameMeaning(previous, item)
    ) {
      throw new Error(
        "Historical regression ID semantic conflict: " +
          item.id,
      );
    }

    byId.set(
      storageId,
      {
        ...(previous ?? {}),
        ...item,
        id: storageId,
        canonicalIssueId,
      },
    );
    byCanonicalIssueId.set(
      canonicalIssueId,
      storageId,
    );
  }

  return {
    schemaVersion: 1,
    regressions: [...byId.values()].sort(
      (a, b) => a.id.localeCompare(b.id),
    ),
  };
}
