import {
  mkdir,
  rename,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { RegressionCorpus } from "./regressions.js";
import { loadRegressionCatalog } from "./catalog-loader.js";
import type { RegressionCase } from "./types.js";

export interface RegressionCatalogWriteResult {
  path: string;
  regressionCount: number;
  regressionIds: readonly string[];
}

function serializedRegressionCatalog(
  regressions: readonly RegressionCase[],
): string {
  return JSON.stringify(
    {
      schemaVersion: 1,
      regressions,
    },
    null,
    2,
  ) + "\n";
}

export async function writeRegressionCatalog(
  catalogRoot: string,
  regression: RegressionCase,
): Promise<RegressionCatalogWriteResult> {
  const existing = await loadRegressionCatalog(
    catalogRoot,
  );
  const corpus = new RegressionCorpus(existing);
  corpus.add(regression);

  const regressions = corpus.all();
  const target = join(
    catalogRoot,
    "regressions.json",
  );
  const temporary =
    target + ".tmp-" + process.pid;

  await mkdir(dirname(target), {
    recursive: true,
  });
  await writeFile(
    temporary,
    serializedRegressionCatalog(regressions),
    "utf8",
  );
  await rename(temporary, target);

  return {
    path: target,
    regressionCount: regressions.length,
    regressionIds: regressions.map(
      (item) => item.id,
    ),
  };
}
