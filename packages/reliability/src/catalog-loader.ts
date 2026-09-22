import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  BlindspotCoverage,
  MinecraftUpdateDelta,
  RegressionCase,
} from "./types.js";
import {
  validateCoverageCatalog,
  validateRegressionCatalog,
  validateUpdateDelta,
} from "./catalogs.js";

interface RegressionCatalogFile {
  schemaVersion: number;
  regressions: RegressionCase[];
}

interface CoverageCatalogFile {
  schemaVersion: number;
  coverage: BlindspotCoverage[];
}

interface UpdateDeltaCatalogFile {
  schemaVersion: number;
  delta: MinecraftUpdateDelta;
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Reliability catalog root must be an object.");
  }
  return value as Record<string, unknown>;
}

function requireSchemaVersion(value: unknown): void {
  if (value !== 1) {
    throw new Error(`Unsupported reliability catalog schemaVersion: ${String(value)}`);
  }
}

export async function loadRegressionCatalog(
  catalogRoot: string,
): Promise<RegressionCase[]> {
  const root = record(await readJson(join(catalogRoot, "regressions.json")));
  requireSchemaVersion(root.schemaVersion);
  if (!Array.isArray(root.regressions)) {
    throw new Error("Regression catalog requires a regressions array.");
  }

  const regressions = root.regressions as RegressionCase[];
  const errors = validateRegressionCatalog(regressions);
  if (errors.length) throw new Error(errors.join("\n"));
  return regressions;
}

export async function loadCoverageCatalog(
  catalogRoot: string,
): Promise<BlindspotCoverage[]> {
  const root = record(await readJson(join(catalogRoot, "coverage.json")));
  requireSchemaVersion(root.schemaVersion);
  if (!Array.isArray(root.coverage)) {
    throw new Error("Coverage catalog requires a coverage array.");
  }

  const coverage = root.coverage as BlindspotCoverage[];
  const errors = validateCoverageCatalog(coverage);
  if (errors.length) throw new Error(errors.join("\n"));
  return coverage;
}

export async function loadUpdateDeltaCatalog(
  catalogRoot: string,
  version: string,
): Promise<MinecraftUpdateDelta> {
  if (!/^[A-Za-z0-9._-]+$/.test(version)) {
    throw new Error("Unsafe Minecraft update catalog version.");
  }

  const root = record(await readJson(
    join(catalogRoot, "minecraft-updates", `${version}.json`),
  ));
  requireSchemaVersion(root.schemaVersion);
  const delta = root.delta as MinecraftUpdateDelta;
  const errors = validateUpdateDelta(delta);
  if (errors.length) throw new Error(errors.join("\n"));

  if (delta.toVersion !== version) {
    throw new Error(
      `Update catalog filename/version mismatch: requested ${version}, delta.toVersion=${delta.toVersion}`,
    );
  }

  return delta;
}

export async function loadReliabilityCatalogs(
  catalogRoot: string,
): Promise<{ regressions: RegressionCase[]; coverage: BlindspotCoverage[] }> {
  const [regressions, coverage] = await Promise.all([
    loadRegressionCatalog(catalogRoot),
    loadCoverageCatalog(catalogRoot),
  ]);

  return { regressions, coverage };
}
