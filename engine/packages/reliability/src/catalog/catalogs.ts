import type {
  BlindspotCoverage,
  FailurePattern,
  MapCompatibilityFingerprint,
  MapKnowledgeRecord,
  MinecraftUpdateDelta,
  RegressionCase,
  ReliabilityDomain,
  ReliabilityLane,
} from "../core/types.js";

export interface ReliabilityCatalogs {
  regressions: readonly RegressionCase[];
  failurePatterns: readonly FailurePattern[];
  coverage: readonly BlindspotCoverage[];
}

const DOMAINS = new Set<ReliabilityDomain>([
  "artifact", "commands", "entities", "structures", "scripts", "world-db",
  "multiplayer", "state", "chunks", "compatibility", "education",
  "combat", "inventory", "economy", "ui", "persistence", "environment",
  "gameplay", "stability", "world", "unknown",
]);

const LANES = new Set<ReliabilityLane>([
  "static", "package", "generative", "runtime", "differential",
]);

export function emptyReliabilityCatalogs(): ReliabilityCatalogs {
  return { regressions: [], failurePatterns: [], coverage: [] };
}


export function validateFailurePatternCatalog(
  patterns: readonly FailurePattern[],
  regressions: readonly RegressionCase[] = [],
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const regressionIds = new Set(regressions.map((item) => item.id));

  for (const pattern of patterns) {
    if (!pattern.id?.trim()) errors.push("Failure pattern id is required.");
    if (ids.has(pattern.id)) errors.push(`Duplicate failure pattern id: ${pattern.id}`);
    ids.add(pattern.id);
    if (!pattern.title?.trim()) errors.push(`Failure pattern ${pattern.id} requires a title.`);
    if (!DOMAINS.has(pattern.domain)) errors.push(`Invalid failure pattern domain: ${pattern.domain}`);
    if (!pattern.summary?.trim()) errors.push(`Failure pattern ${pattern.id} requires a summary.`);

    for (const field of [
      ["invariantIds", pattern.invariantIds],
      ["triggerTags", pattern.triggerTags],
      ["capabilityTags", pattern.capabilityTags],
      ["supportingRegressionIds", pattern.supportingRegressionIds],
      ["detectionHints", pattern.detectionHints],
      ["retestFocus", pattern.retestFocus],
    ] as const) {
      if (
        !Array.isArray(field[1]) ||
        field[1].length === 0 ||
        field[1].some((value) => typeof value !== "string" || !value.trim())
      ) {
        errors.push(`Failure pattern ${pattern.id} requires non-empty ${field[0]}.`);
      }
    }

    for (const regressionId of pattern.supportingRegressionIds ?? []) {
      if (regressions.length > 0 && !regressionIds.has(regressionId)) {
        errors.push(
          `Failure pattern ${pattern.id} references unknown regression: ${regressionId}`,
        );
      }
    }
  }

  if (regressions.length > 0) {
    const coveredRegressionIds = new Set(
      patterns.flatMap((pattern) => pattern.supportingRegressionIds ?? []),
    );
    for (const regression of regressions) {
      if (!coveredRegressionIds.has(regression.id)) {
        errors.push(
          `Regression ${regression.id} has no failure-pattern learning coverage.`,
        );
      }
    }
  }

  return errors;
}

export function validateMapKnowledgeRecord(
  record: MapKnowledgeRecord,
  regressions: readonly RegressionCase[] = [],
  patterns: readonly FailurePattern[] = [],
): string[] {
  const errors: string[] = [];
  const regressionIds = new Set(regressions.map((item) => item.id));
  const patternIds = new Set(patterns.map((item) => item.id));

  if (record.schemaVersion !== 1) errors.push("Map knowledge schemaVersion must be 1.");
  if (!record.mapId?.trim()) errors.push("Map knowledge mapId is required.");
  if (!record.label?.trim()) errors.push(`Map knowledge ${record.mapId} requires a label.`);
  if (!["artifact-inspection", "historical-regression"].includes(record.evidenceBasis)) {
    errors.push(`Map knowledge ${record.mapId} has invalid evidenceBasis.`);
  }
  for (const domain of record.domains ?? []) {
    if (!DOMAINS.has(domain)) errors.push(`Invalid map knowledge domain: ${domain}`);
  }
  for (const [name, values] of [
    ["editions", record.editions],
    ["evidenceRefs", record.evidenceRefs],
    ["architectureTags", record.architectureTags],
    ["gameplayPatternTags", record.gameplayPatternTags],
    ["capabilityTags", record.capabilityTags],
    ["riskSurfaces", record.riskSurfaces],
    ["invariantIds", record.invariantIds],
    ["regressionIds", record.regressionIds],
    ["failurePatternIds", record.failurePatternIds],
  ] as const) {
    if (!Array.isArray(values) || values.length === 0 ||
        values.some((value) => typeof value !== "string" || !value.trim())) {
      errors.push(`Map knowledge ${record.mapId} requires non-empty ${name}.`);
    }
  }
  for (const id of record.regressionIds ?? []) {
    if (regressions.length > 0 && !regressionIds.has(id)) {
      errors.push(`Map knowledge ${record.mapId} references unknown regression: ${id}`);
    }
  }
  if (record.evidenceBasis === "historical-regression") {
    const owned = new Set(record.regressionIds ?? []);
    const unresolved = (record.evidenceRefs ?? []).filter(
      (id) => !owned.has(id),
    );
    if (unresolved.length > 0) {
      errors.push(
        "Historical map knowledge evidenceRefs must resolve to regressionIds: " +
          unresolved.join(", "),
      );
    }
  }
  for (const id of record.failurePatternIds ?? []) {
    if (patterns.length > 0 && !patternIds.has(id)) {
      errors.push(`Map knowledge ${record.mapId} references unknown failure pattern: ${id}`);
    }
  }
  return errors;
}

export function validateMapCompatibilityFingerprint(
  fingerprint: MapCompatibilityFingerprint,
): string[] {
  const errors: string[] = [];
  if (fingerprint.schemaVersion !== 1) {
    errors.push("Map fingerprint schemaVersion must be 1.");
  }
  if (!fingerprint.mapId?.trim()) errors.push("Map fingerprint mapId is required.");
  if (fingerprint.artifactFingerprint !== undefined && !fingerprint.artifactFingerprint.trim()) {
    errors.push("Map fingerprint artifactFingerprint cannot be empty.");
  }
  for (const domain of fingerprint.domains ?? []) {
    if (!DOMAINS.has(domain)) {
      errors.push(`Invalid map fingerprint domain: ${domain}`);
    }
  }
  for (const field of [
    fingerprint.minEngineVersions,
    fingerprint.editions,
    fingerprint.experiments,
    fingerprint.commandVerbs,
    fingerprint.scriptModules,
    fingerprint.capabilityTags,
    fingerprint.riskSurfaces,
  ]) {
    if (!Array.isArray(field) || field.some((value) => typeof value !== "string" || !value.trim())) {
      errors.push("Map fingerprint list fields must contain non-empty strings.");
      break;
    }
  }
  if (
    !fingerprint.structures ||
    !Number.isInteger(fingerprint.structures.count) ||
    !Number.isInteger(fingerprint.structures.parsed) ||
    fingerprint.structures.count < 0 ||
    fingerprint.structures.parsed < 0 ||
    fingerprint.structures.parsed > fingerprint.structures.count
  ) {
    errors.push("Map fingerprint structures counts are invalid.");
  }
  if (typeof fingerprint.worldDatabasePresent !== "boolean") {
    errors.push("Map fingerprint worldDatabasePresent must be boolean.");
  }
  return errors;
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
