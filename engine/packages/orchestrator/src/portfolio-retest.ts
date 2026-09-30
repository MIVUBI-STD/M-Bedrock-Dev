import { loadReliabilityCatalogs, loadUpdateDeltaCatalog } from "../../reliability/src/index.js";
import { planPortfolioRetest } from "../../reliability/src/index.js";
import type { MapCompatibilityFingerprint } from "../../reliability/src/index.js";

export interface PortfolioFingerprintEntry {
  fingerprint: MapCompatibilityFingerprint;
  labels?: readonly string[];
}

export interface PortfolioRetestFromCatalogInput {
  catalogRoot: string;
  updateVersion: string;
  maps: readonly PortfolioFingerprintEntry[];
}

export async function planPortfolioRetestFromCatalogs(
  input: PortfolioRetestFromCatalogInput,
) {
  const [{ regressions, coverage }, updateDelta] = await Promise.all([
    loadReliabilityCatalogs(input.catalogRoot),
    loadUpdateDeltaCatalog(input.catalogRoot, input.updateVersion),
  ]);

  return planPortfolioRetest(
    input.maps,
    updateDelta,
    regressions,
    coverage,
  );
}
