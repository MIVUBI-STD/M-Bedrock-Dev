import {
  mkdir,
  readFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  atomicWriteText,
} from "../../../repair/src/index.js";
import {
  mergeHistoricalRegressionCatalog,
  type HistoricalRegressionCatalog,
  type HistoricalRegressionRecord,
} from "./historical-regression-catalog.js";

export const HISTORICAL_REGRESSION_CATALOG_PATH =
  "engine/reliability/catalogs/regressions.json" as const;

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
  incoming: readonly HistoricalRegressionRecord[],
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
  await mkdir(dirname(path), {
    recursive: true,
  });
  await atomicWriteText(
    path,
    JSON.stringify(merged, null, 2) + "\n",
  );
  return merged;
}
