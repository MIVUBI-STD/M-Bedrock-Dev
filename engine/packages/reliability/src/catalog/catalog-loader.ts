import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  BlindspotCoverage,
  FailurePattern,
  MapCompatibilityFingerprint,
  MapKnowledgeRecord,
  MinecraftUpdateDelta,
  RegressionCase,
} from "../core/types.js";
import {
  validateCoverageCatalog,
  validateFailurePatternCatalog,
  validateMapCompatibilityFingerprint,
  validateMapKnowledgeRecord,
  validateRegressionCatalog,
  validateUpdateDelta,
} from "./catalogs.js";

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

export async function loadFailurePatternCatalog(
  catalogRoot: string,
  regressions: readonly RegressionCase[] = [],
): Promise<FailurePattern[]> {
  const root = record(await readJson(join(catalogRoot, "failure-patterns.json")));
  requireSchemaVersion(root.schemaVersion);
  if (!Array.isArray(root.patterns)) {
    throw new Error("Failure pattern catalog requires a patterns array.");
  }

  const patterns = root.patterns as FailurePattern[];
  const errors = validateFailurePatternCatalog(patterns, regressions);
  if (errors.length) throw new Error(errors.join("\n"));
  return patterns;
}

export async function loadMapKnowledgeCatalog(
  catalogRoot: string,
  mapId: string,
  regressions: readonly RegressionCase[] = [],
  patterns: readonly FailurePattern[] = [],
): Promise<MapKnowledgeRecord> {
  if (!/^[A-Za-z0-9._-]+$/.test(mapId)) {
    throw new Error("Unsafe map knowledge id.");
  }
  const root = record(await readJson(
    join(catalogRoot, "map-knowledge", `${mapId}.json`),
  ));
  const map = root as unknown as MapKnowledgeRecord;
  const errors = validateMapKnowledgeRecord(map, regressions, patterns);
  if (errors.length) throw new Error(errors.join("\n"));
  if (map.mapId !== mapId) {
    throw new Error(
      `Map knowledge filename/id mismatch: requested ${mapId}, mapId=${map.mapId}`,
    );
  }
  return map;
}

export async function loadMapFingerprintCatalog(
  catalogRoot: string,
  mapId: string,
): Promise<MapCompatibilityFingerprint> {
  if (!/^[A-Za-z0-9._-]+$/.test(mapId)) {
    throw new Error("Unsafe map fingerprint id.");
  }
  const root = record(await readJson(
    join(catalogRoot, "map-fingerprints", `${mapId}.json`),
  ));
  const fingerprint = root as unknown as MapCompatibilityFingerprint;
  const errors = validateMapCompatibilityFingerprint(fingerprint);
  if (errors.length) throw new Error(errors.join("\n"));
  if (fingerprint.mapId !== mapId) {
    throw new Error(
      `Map fingerprint filename/id mismatch: requested ${mapId}, mapId=${fingerprint.mapId}`,
    );
  }
  return fingerprint;
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
): Promise<{
  regressions: RegressionCase[];
  failurePatterns: FailurePattern[];
  coverage: BlindspotCoverage[];
}> {
  const regressions = await loadRegressionCatalog(catalogRoot);
  const [failurePatterns, coverage] = await Promise.all([
    loadFailurePatternCatalog(catalogRoot, regressions),
    loadCoverageCatalog(catalogRoot),
  ]);

  return { regressions, failurePatterns, coverage };
}
