import type {
  BlindspotCoverage,
  MinecraftUpdateDelta,
  RegressionCase,
} from "./types.js";

export interface ReliabilityCatalogs {
  regressions: readonly RegressionCase[];
  coverage: readonly BlindspotCoverage[];
}

export function emptyReliabilityCatalogs(): ReliabilityCatalogs {
  return {
    regressions: [],
    coverage: [],
  };
}

export function validateUpdateDelta(delta: MinecraftUpdateDelta): string[] {
  const errors: string[] = [];
  if (!delta.toVersion.trim()) errors.push("Update delta toVersion is required.");

  const ids = new Set<string>();
  for (const entry of delta.entries) {
    if (!entry.id.trim()) errors.push("Update delta entry id is required.");
    if (ids.has(entry.id)) errors.push(`Duplicate update delta entry id: ${entry.id}`);
    ids.add(entry.id);
    if (!entry.summary.trim()) errors.push(`Update delta entry ${entry.id} requires a summary.`);
    if (!entry.source.trim()) errors.push(`Update delta entry ${entry.id} requires a source.`);
  }

  return errors;
}

export function validateRegressionCatalog(
  regressions: readonly RegressionCase[],
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const regression of regressions) {
    if (!regression.id.trim()) errors.push("Regression id is required.");
    if (ids.has(regression.id)) errors.push(`Duplicate regression id: ${regression.id}`);
    ids.add(regression.id);
    if (!regression.title.trim()) errors.push(`Regression ${regression.id} requires a title.`);
    if (!regression.expected.trim()) errors.push(`Regression ${regression.id} requires expected behavior.`);
    if (!regression.observed.trim()) errors.push(`Regression ${regression.id} requires observed behavior.`);
  }

  return errors;
}
