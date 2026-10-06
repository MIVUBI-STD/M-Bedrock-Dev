import {
  mkdir,
  readFile,
  rename,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import type {
  HistoricalRegressionCatalog,
  RegressionCase,
} from "../core/types.js";
import {
  mergeHistoricalRegressionCatalog,
} from "./historical-regression-catalog.js";

export const HISTORICAL_REGRESSION_CATALOG_PATH =
  "engine/reliability/catalogs/regressions.json" as const;

async function atomicWriteJson(
  path: string,
  value: unknown,
): Promise<void> {
  await mkdir(dirname(path), {
    recursive: true,
  });
  const temporary =
    path + ".tmp";
  await writeFile(
    temporary,
    JSON.stringify(value, null, 2) + "\n",
    "utf8",
  );
  await rename(temporary, path);
}

export async function loadHistoricalRegressionCatalog(
  repositoryRoot: string,
): Promise<HistoricalRegressionCatalog> {
  const path = join(
    repositoryRoot,
    HISTORICAL_REGRESSION_CATALOG_PATH,
  );
  const raw = JSON.parse(
    await readFile(path, "utf8"),
  ) as HistoricalRegressionCatalog;

  if (
    raw.schemaVersion !== 1 ||
    !Array.isArray(raw.regressions)
  ) {
    throw new Error(
      "Historical regression catalog is structurally invalid.",
    );
  }
  return raw;
}

export async function mergeAndSaveHistoricalRegressions(
  repositoryRoot: string,
  incoming: readonly RegressionCase[],
): Promise<HistoricalRegressionCatalog> {
  const current =
    await loadHistoricalRegressionCatalog(
      repositoryRoot,
    );
  const merged =
    mergeHistoricalRegressionCatalog(
      current,
      incoming,
    );
  const path = join(
    repositoryRoot,
    HISTORICAL_REGRESSION_CATALOG_PATH,
  );
  await atomicWriteJson(
    path,
    merged,
  );
  return merged;
}
