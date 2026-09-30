import {
  mkdir,
  readFile,
  rename,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import type {
  PortfolioMapReleaseStatus,
} from "./portfolio-release-gate.js";
import {
  portfolioReleaseManifestJson,
  type PortfolioReleaseManifest,
} from "./portfolio-release-report.js";

export interface PersistPortfolioReleaseInput {
  historyRoot: string;
  releaseId: string;
  manifest: PortfolioReleaseManifest;
}

export interface PersistPortfolioReleaseResult {
  path: string;
  releaseId: string;
}

export interface PortfolioReleaseManifestComparison {
  fromReleaseId: string;
  toReleaseId: string;
  dispositionChanged: boolean;
  fromDisposition: PortfolioReleaseManifest["disposition"];
  toDisposition: PortfolioReleaseManifest["disposition"];
  improvedMapIds: readonly string[];
  worsenedMapIds: readonly string[];
  unchangedMapIds: readonly string[];
  addedMapIds: readonly string[];
  removedMapIds: readonly string[];
  addedRegressions: readonly string[];
  resolvedRegressions: readonly string[];
}

const STATUS_RANK: Readonly<Record<
  PortfolioMapReleaseStatus,
  number
>> = {
  cleared: 0,
  "manual-required": 1,
  blocked: 2,
  missing: 3,
  regressed: 4,
};

function safeReleaseId(releaseId: string): string {
  if (
    !releaseId.trim() ||
    !/^[A-Za-z0-9._-]+$/.test(releaseId)
  ) {
    throw new Error(
      "Unsafe portfolio release history id.",
    );
  }
  return releaseId;
}

function pathFor(
  historyRoot: string,
  releaseId: string,
): string {
  return join(
    historyRoot,
    "portfolio-releases",
    safeReleaseId(releaseId) + ".json",
  );
}

export async function persistPortfolioReleaseManifest(
  input: PersistPortfolioReleaseInput,
): Promise<PersistPortfolioReleaseResult> {
  const target = pathFor(
    input.historyRoot,
    input.releaseId,
  );

  try {
    await readFile(target, "utf8");
    throw new Error(
      "Portfolio release history entry already exists: " +
        input.releaseId +
        ".",
    );
  } catch (error) {
    if (
      error instanceof Error &&
      /already exists/.test(error.message)
    ) {
      throw error;
    }
    const code = (
      error as NodeJS.ErrnoException
    ).code;
    if (code !== "ENOENT") throw error;
  }

  await mkdir(
    join(input.historyRoot, "portfolio-releases"),
    { recursive: true },
  );

  const temporary =
    target + ".tmp-" + process.pid;

  await writeFile(
    temporary,
    portfolioReleaseManifestJson(
      input.manifest,
    ),
    "utf8",
  );
  await rename(temporary, target);

  return {
    path: target,
    releaseId: input.releaseId,
  };
}

export async function loadPortfolioReleaseManifest(
  historyRoot: string,
  releaseId: string,
): Promise<PortfolioReleaseManifest> {
  const raw = JSON.parse(
    await readFile(
      pathFor(historyRoot, releaseId),
      "utf8",
    ),
  ) as PortfolioReleaseManifest;

  if (raw.schemaVersion !== 1) {
    throw new Error(
      "Unsupported portfolio release manifest schemaVersion.",
    );
  }
  return raw;
}

function regressionKeys(
  manifest: PortfolioReleaseManifest,
): Set<string> {
  const keys = new Set<string>();

  for (const map of manifest.maps) {
    for (const [kind, entries] of [
      ["regressed", map.regressed],
      ["blocked", map.blocked],
      ["manual", map.manualRequired],
    ] as const) {
      for (const entry of entries) {
        keys.add(
          map.mapId +
            "::" +
            kind +
            "::" +
            entry.regressionId,
        );
      }
    }
  }

  return keys;
}

export function comparePortfolioReleaseManifests(
  fromReleaseId: string,
  from: PortfolioReleaseManifest,
  toReleaseId: string,
  to: PortfolioReleaseManifest,
): PortfolioReleaseManifestComparison {
  const fromMaps = new Map(
    from.maps.map((map) => [
      map.mapId,
      map.status,
    ]),
  );
  const toMaps = new Map(
    to.maps.map((map) => [
      map.mapId,
      map.status,
    ]),
  );

  const improvedMapIds: string[] = [];
  const worsenedMapIds: string[] = [];
  const unchangedMapIds: string[] = [];
  const addedMapIds: string[] = [];
  const removedMapIds: string[] = [];

  const allMapIds = new Set([
    ...fromMaps.keys(),
    ...toMaps.keys(),
  ]);

  for (const mapId of allMapIds) {
    const before = fromMaps.get(mapId);
    const after = toMaps.get(mapId);

    if (before === undefined) {
      addedMapIds.push(mapId);
      continue;
    }
    if (after === undefined) {
      removedMapIds.push(mapId);
      continue;
    }

    const delta =
      STATUS_RANK[after] -
      STATUS_RANK[before];

    if (delta < 0) {
      improvedMapIds.push(mapId);
    } else if (delta > 0) {
      worsenedMapIds.push(mapId);
    } else {
      unchangedMapIds.push(mapId);
    }
  }

  const fromRegressions = regressionKeys(from);
  const toRegressions = regressionKeys(to);

  const addedRegressions = [
    ...toRegressions,
  ].filter((key) => !fromRegressions.has(key))
    .sort();

  const resolvedRegressions = [
    ...fromRegressions,
  ].filter((key) => !toRegressions.has(key))
    .sort();

  return {
    fromReleaseId,
    toReleaseId,
    dispositionChanged:
      from.disposition !== to.disposition,
    fromDisposition: from.disposition,
    toDisposition: to.disposition,
    improvedMapIds: improvedMapIds.sort(),
    worsenedMapIds: worsenedMapIds.sort(),
    unchangedMapIds: unchangedMapIds.sort(),
    addedMapIds: addedMapIds.sort(),
    removedMapIds: removedMapIds.sort(),
    addedRegressions,
    resolvedRegressions,
  };
}
