export interface HistoricalRegressionProvenance {
  readonly source: string;
  readonly reportPath?: string;
  readonly map?: string;
  readonly mapVersion?: string;
  readonly bugId?: string;
  readonly artifactFingerprint?: string;
  readonly [key: string]: unknown;
}

export interface HistoricalRegressionRecord {
  readonly id: string;
  readonly title: string;
  readonly domain: string;
  readonly discoveredBy: string;
  readonly provenance?: HistoricalRegressionProvenance;
  readonly triggerTags?: readonly string[];
  readonly capabilityTags?: readonly string[];
  readonly reproduction?: readonly string[];
  readonly expected: string;
  readonly observed: string;
  readonly [key: string]: unknown;
}

export interface HistoricalRegressionCatalogEntry {
  readonly id: string;
  readonly title?: string;
  readonly [key: string]: unknown;
}

export interface HistoricalRegressionCatalog {
  readonly schemaVersion: 1;
  readonly regressions:
    readonly HistoricalRegressionCatalogEntry[];
}

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
  right: HistoricalRegressionRecord,
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
    readonly HistoricalRegressionRecord[],
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

  for (const item of incoming) {
    const previous = byId.get(item.id);
    if (
      previous !== undefined &&
      !sameMeaning(previous, item)
    ) {
      throw new Error(
        "Historical regression ID semantic conflict: " +
          item.id,
      );
    }
    byId.set(item.id, item);
  }

  return {
    schemaVersion: 1,
    regressions: [...byId.values()].sort(
      (a, b) => a.id.localeCompare(b.id),
    ),
  };
}
