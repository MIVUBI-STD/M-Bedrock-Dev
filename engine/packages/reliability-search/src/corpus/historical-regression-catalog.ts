import type {
  BugFinderCategory,
  BugReportV2,
} from "../../../bug-report/src/index.js";

export interface HistoricalRegressionProvenance {
  readonly source: "Canonical Bug Report V2";
  readonly reportPath: string;
  readonly map: string;
  readonly mapVersion: string;
  readonly bugId: string;
  readonly artifactFingerprint: string;
}

export interface HistoricalRegressionRecord {
  readonly id: string;
  readonly title: string;
  readonly domain: string;
  readonly discoveredBy:
    | "approved-ai"
    | "approved-tester";
  readonly provenance: HistoricalRegressionProvenance;
  readonly triggerTags: readonly string[];
  readonly capabilityTags: readonly string[];
  readonly reproduction?: readonly string[];
  readonly expected: string;
  readonly observed: string;
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

const DOMAIN_BY_CATEGORY:
  Readonly<Record<BugFinderCategory, string>> = {
    "game-flow": "gameplay",
    "player-state": "state",
    "multiplayer-session": "multiplayer",
    "world-interaction": "world",
    "entity-behavior": "entities",
    "combat": "combat",
    "score-reward": "economy",
    "ui-feedback": "ui",
    "performance-stability": "stability",
    "compatibility": "compatibility",
  };

const CAPABILITIES_BY_CATEGORY:
  Readonly<Record<BugFinderCategory, readonly string[]>> = {
    "game-flow": ["gameplay-state", "progression"],
    "player-state": ["state", "persistence"],
    "multiplayer-session": ["multiplayer", "arena-lifecycle"],
    "world-interaction": ["world-mutation", "spatial"],
    "entity-behavior": ["entity-ai", "navigation"],
    "combat": ["combat", "entity-ai"],
    "score-reward": ["economy", "reward"],
    "ui-feedback": ["ui-state", "gameplay-state"],
    "performance-stability": ["runtime-stability", "chunks"],
    "compatibility": ["compatibility", "platform"],
  };

function slug(value: string): string {
  const clean = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return clean || "unknown";
}

function unique(values: readonly string[]): string[] {
  return [...new Set(
    values
      .map((value) => value.trim())
      .filter(Boolean),
  )].sort();
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

export function projectApprovedBugReportToHistoricalRegressions(
  input: {
    readonly report: BugReportV2;
    readonly reportPath: string;
    readonly artifactFingerprint: string;
  },
): readonly HistoricalRegressionRecord[] {
  return input.report.bugs.map((bug) => ({
    id: historicalRegressionId({
      mapName: input.report.map.name,
      mapVersion: input.report.map.mapVersion,
      bugId: bug.id,
    }),
    title: bug.title,
    domain:
      DOMAIN_BY_CATEGORY[bug.category],
    discoveredBy:
      bug.foundBy === "tester"
        ? "approved-tester" as const
        : "approved-ai" as const,
    provenance: {
      source: "Canonical Bug Report V2" as const,
      reportPath: input.reportPath,
      map: input.report.map.name,
      mapVersion:
        input.report.map.mapVersion,
      bugId: bug.id,
      artifactFingerprint:
        input.artifactFingerprint,
    },
    triggerTags: unique([
      "gameplay",
      bug.category,
      bug.severity,
      ...(bug.mustPreserve ?? []),
    ]),
    capabilityTags: [
      ...CAPABILITIES_BY_CATEGORY[
        bug.category
      ],
    ],
    ...(bug.reproduction?.length
      ? {
          reproduction: [
            ...bug.reproduction,
          ],
        }
      : {}),
    expected: bug.expected,
    observed: bug.observed,
  }));
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

  // Legacy catalog entries may not carry the new provenance fields.
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
