import type {
  BlindspotCoverage,
  MinecraftUpdateDelta,
  RegressionCase,
  ReliabilityDomain,
  ReliabilityLane,
} from "./types.js";

export interface ReliabilityCatalogs {
  regressions: readonly RegressionCase[];
  coverage: readonly BlindspotCoverage[];
}

const DOMAINS = new Set<ReliabilityDomain>([
  "artifact", "commands", "entities", "structures", "scripts", "world-db",
  "multiplayer", "state", "chunks", "compatibility", "education", "unknown",
]);

const LANES = new Set<ReliabilityLane>([
  "static", "package", "generative", "runtime", "differential",
]);

export function emptyReliabilityCatalogs(): ReliabilityCatalogs {
  return { regressions: [], coverage: [] };
}

export function validateUpdateDelta(delta: MinecraftUpdateDelta): string[] {
  const errors: string[] = [];
  if (!delta || typeof delta !== "object") return ["Update delta is required."];
  if (!delta.toVersion?.trim()) errors.push("Update delta toVersion is required.");
  if (!Array.isArray(delta.entries)) return [...errors, "Update delta entries array is required."];

  const ids = new Set<string>();
  for (const entry of delta.entries) {
    if (!entry.id?.trim()) errors.push("Update delta entry id is required.");
    if (ids.has(entry.id)) errors.push(`Duplicate update delta entry id: ${entry.id}`);
    ids.add(entry.id);
    if (!DOMAINS.has(entry.domain)) errors.push(`Invalid update domain for ${entry.id}: ${entry.domain}`);
    if (!entry.summary?.trim()) errors.push(`Update delta entry ${entry.id} requires a summary.`);
    if (!entry.source?.trim()) errors.push(`Update delta entry ${entry.id} requires a source.`);
  }

  return errors;
}

export function validateRegressionCatalog(
  regressions: readonly RegressionCase[],
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const regression of regressions) {
    if (!regression.id?.trim()) errors.push("Regression id is required.");
    if (ids.has(regression.id)) errors.push(`Duplicate regression id: ${regression.id}`);
    ids.add(regression.id);
    if (!regression.title?.trim()) errors.push(`Regression ${regression.id} requires a title.`);
    if (!DOMAINS.has(regression.domain)) errors.push(`Invalid regression domain: ${regression.domain}`);
    if (!regression.expected?.trim()) errors.push(`Regression ${regression.id} requires expected behavior.`);
    if (!regression.observed?.trim()) errors.push(`Regression ${regression.id} requires observed behavior.`);
    if (!Array.isArray(regression.capabilityTags)) errors.push(`Regression ${regression.id} requires capabilityTags.`);
    if (!Array.isArray(regression.reproduction)) errors.push(`Regression ${regression.id} requires reproduction steps.`);
  }

  return errors;
}

export function validateCoverageCatalog(
  coverage: readonly BlindspotCoverage[],
): string[] {
  const errors: string[] = [];
  const keys = new Set<string>();

  for (const item of coverage) {
    const key = `${item.domain}:${item.lane}`;
    if (keys.has(key)) errors.push(`Duplicate coverage entry: ${key}`);
    keys.add(key);

    if (!DOMAINS.has(item.domain)) errors.push(`Invalid coverage domain: ${item.domain}`);
    if (!LANES.has(item.lane)) errors.push(`Invalid coverage lane: ${item.lane}`);
    if (!["covered", "partial", "unknown", "not-applicable"].includes(item.state)) {
      errors.push(`Invalid coverage state for ${key}: ${item.state}`);
    }

    if (item.state === "partial" || item.state === "covered") {
      if (!item.evidence?.trim()) {
        errors.push(`Coverage ${key} requires evidence for state ${item.state}.`);
      }
      if (
        !Array.isArray(item.proofPaths) ||
        item.proofPaths.length === 0 ||
        item.proofPaths.some((value) => typeof value !== "string" || !value.trim())
      ) {
        errors.push(`Coverage ${key} requires non-empty proofPaths for state ${item.state}.`);
      }
    }
  }

  return errors;
}
