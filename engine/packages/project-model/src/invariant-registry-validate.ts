import type {
  InvariantRegistryEntry,
  InvariantRegistrySnapshot,
} from "./invariant-registry.js";

const SOURCE_KINDS = new Set([
  "knowledge-relation",
  "mined-invariant",
  "manual-policy",
]);
const ENFORCEMENT = new Set([
  "static",
  "runtime-state",
  "runtime-temporal",
  "diagnostic-only",
]);
const CLAIMS = new Set([
  "hypothesis",
  "corroborated",
  "proven-static",
  "proven-runtime",
]);
const REVALIDATION = new Set([
  "static",
  "transitive",
  "runtime",
  "package",
]);

const SCOPE_FIELDS = new Set([
  "arenaId",
  "arenaGeneration",
  "playerKey",
  "connectionGeneration",
  "lifeGeneration",
  "entityKey",
  "entityGeneration",
  "operationId",
  "subsystemGeneration",
]);

const SCOPE_STRING_FIELDS = new Set([
  "arenaId",
  "playerKey",
  "entityKey",
  "operationId",
]);

const SCOPE_GENERATION_FIELDS = new Set([
  "arenaGeneration",
  "connectionGeneration",
  "lifeGeneration",
  "entityGeneration",
  "subsystemGeneration",
]);

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function duplicate(values: readonly string[]): string | undefined {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) return value;
    seen.add(value);
  }
  return undefined;
}

function validateScope(
  value: unknown,
  label: string,
): string[] {
  if (value === undefined) return [];
  if (!record(value)) {
    return [label + " must be an object when provided."];
  }

  const errors: string[] = [];
  for (const [key, item] of Object.entries(value)) {
    if (!SCOPE_FIELDS.has(key)) {
      errors.push(label + " has unknown field " + key + ".");
      continue;
    }
    if (
      SCOPE_STRING_FIELDS.has(key) &&
      !nonEmpty(item)
    ) {
      errors.push(
        label + "." + key +
          " must be a non-empty string when provided.",
      );
      continue;
    }
    if (
      SCOPE_GENERATION_FIELDS.has(key) &&
      (
        typeof item !== "number" ||
        !Number.isInteger(item) ||
        item < 0
      )
    ) {
      errors.push(
        label + "." + key +
          " must be a non-negative integer when provided.",
      );
    }
  }
  return errors;
}

function validateStateRequirement(
  value: unknown,
  label: string,
): string[] {
  if (!record(value)) {
    return [label + " must be an object."];
  }

  const errors: string[] = [];
  if (!nonEmpty(value.id)) {
    errors.push(label + ".id must be non-empty.");
  }
  if (!nonEmpty(value.predicate)) {
    errors.push(label + ".predicate must be non-empty.");
  }
  if (
    value.expectedState !== "present" &&
    value.expectedState !== "absent"
  ) {
    errors.push(
      label + ".expectedState must be present or absent.",
    );
  }
  errors.push(...validateScope(value.scope, label + ".scope"));
  return errors;
}

function validateTemporalRequirement(
  value: unknown,
  label: string,
): string[] {
  if (!record(value)) {
    return [label + " must be an object."];
  }

  const errors: string[] = [];
  if (!nonEmpty(value.id)) {
    errors.push(label + ".id must be non-empty.");
  }
  if (!nonEmpty(value.beforePredicate)) {
    errors.push(
      label + ".beforePredicate must be non-empty.",
    );
  }
  if (!nonEmpty(value.afterPredicate)) {
    errors.push(
      label + ".afterPredicate must be non-empty.",
    );
  }
  if (
    value.maxTickDelta !== undefined &&
    (
      typeof value.maxTickDelta !== "number" ||
      !Number.isFinite(value.maxTickDelta) ||
      value.maxTickDelta < 0
    )
  ) {
    errors.push(
      label +
        ".maxTickDelta must be a non-negative finite number when provided.",
    );
  }
  errors.push(...validateScope(value.scope, label + ".scope"));
  return errors;
}

function validateEntry(value: unknown, index: number): string[] {
  if (!record(value)) {
    return ["entries[" + index + "] must be an object."];
  }

  const errors: string[] = [];
  if (!nonEmpty(value.id)) {
    errors.push("entries[" + index + "].id must be non-empty.");
  }

  if (!record(value.source)) {
    errors.push("entries[" + index + "].source must be an object.");
  } else {
    if (!SOURCE_KINDS.has(String(value.source.kind))) {
      errors.push("entries[" + index + "].source.kind is invalid.");
    }
    if (!nonEmpty(value.source.id)) {
      errors.push("entries[" + index + "].source.id must be non-empty.");
    }
    if (!nonEmpty(value.source.revision)) {
      errors.push(
        "entries[" + index + "].source.revision must be non-empty.",
      );
    }
  }

  if (!ENFORCEMENT.has(String(value.enforcement))) {
    errors.push("entries[" + index + "].enforcement is invalid.");
  }
  if (!CLAIMS.has(String(value.minimumRepairClaim))) {
    errors.push("entries[" + index + "].minimumRepairClaim is invalid.");
  }

  if (!Array.isArray(value.stateRequirements)) {
    errors.push(
      "entries[" + index + "].stateRequirements must be an array.",
    );
  } else {
    errors.push(
      ...value.stateRequirements.flatMap((requirement, requirementIndex) =>
        validateStateRequirement(
          requirement,
          "entries[" + index + "].stateRequirements[" +
            requirementIndex + "]",
        )
      ),
    );
    const stateIds = value.stateRequirements
      .filter(record)
      .map((requirement) => requirement.id)
      .filter(nonEmpty);
    const repeatedStateId = duplicate(stateIds);
    if (repeatedStateId) {
      errors.push(
        "entries[" + index +
          "] has duplicate state requirement id " +
          repeatedStateId + ".",
      );
    }
  }

  if (!Array.isArray(value.temporalRequirements)) {
    errors.push(
      "entries[" + index + "].temporalRequirements must be an array.",
    );
  } else {
    errors.push(
      ...value.temporalRequirements.flatMap(
        (requirement, requirementIndex) =>
          validateTemporalRequirement(
            requirement,
            "entries[" + index + "].temporalRequirements[" +
              requirementIndex + "]",
          )
      ),
    );
    const temporalIds = value.temporalRequirements
      .filter(record)
      .map((requirement) => requirement.id)
      .filter(nonEmpty);
    const repeatedTemporalId = duplicate(temporalIds);
    if (repeatedTemporalId) {
      errors.push(
        "entries[" + index +
          "] has duplicate temporal requirement id " +
          repeatedTemporalId + ".",
      );
    }
  }

  if (!Array.isArray(value.revalidationLayers)) {
    errors.push(
      "entries[" + index + "].revalidationLayers must be an array.",
    );
  } else {
    const layers = value.revalidationLayers.map(String);
    const invalid = layers.find((layer) => !REVALIDATION.has(layer));
    if (invalid) {
      errors.push(
        "entries[" + index + "] has invalid revalidation layer " +
          invalid +
          ".",
      );
    }
    const repeated = duplicate(layers);
    if (repeated) {
      errors.push(
        "entries[" + index + "] has duplicate revalidation layer " +
          repeated +
          ".",
      );
    }
  }

  if (
    Array.isArray(value.stateRequirements) &&
    Array.isArray(value.temporalRequirements)
  ) {
    if (
      value.enforcement === "runtime-state" &&
      value.stateRequirements.length === 0
    ) {
      errors.push(
        "entries[" + index +
          "] runtime-state enforcement requires stateRequirements.",
      );
    }
    if (
      value.enforcement === "runtime-temporal" &&
      value.temporalRequirements.length === 0
    ) {
      errors.push(
        "entries[" + index +
          "] runtime-temporal enforcement requires temporalRequirements.",
      );
    }
    if (
      (value.enforcement === "static" ||
        value.enforcement === "diagnostic-only") &&
      (
        value.stateRequirements.length > 0 ||
        value.temporalRequirements.length > 0
      )
    ) {
      errors.push(
        "entries[" + index + "] " + value.enforcement +
          " enforcement cannot carry executable runtime requirements.",
      );
    }
  }

  if (
    Array.isArray(value.revalidationLayers) &&
    (
      value.enforcement === "runtime-state" ||
      value.enforcement === "runtime-temporal"
    ) &&
    !value.revalidationLayers.includes("runtime")
  ) {
    errors.push(
      "entries[" + index +
        "] runtime enforcement requires runtime revalidation.",
    );
  }

  if (
    Array.isArray(value.revalidationLayers) &&
    value.enforcement === "diagnostic-only" &&
    (
      value.revalidationLayers.includes("runtime") ||
      value.revalidationLayers.includes("package")
    )
  ) {
    errors.push(
      "entries[" + index +
        "] diagnostic-only enforcement cannot require runtime/package revalidation.",
    );
  }

  return errors;
}

export function validateInvariantRegistrySnapshot(
  input: unknown,
): string[] {
  if (!record(input)) {
    return ["Invariant registry snapshot must be an object."];
  }

  const errors: string[] = [];
  if (input.schemaVersion !== 1) {
    errors.push("Invariant registry schemaVersion must be 1.");
  }
  if (!nonEmpty(input.revision)) {
    errors.push("Invariant registry revision must be non-empty.");
  }
  if (!nonEmpty(input.profileKey)) {
    errors.push("Invariant registry profileKey must be non-empty.");
  }
  if (!Array.isArray(input.entries)) {
    errors.push("Invariant registry entries must be an array.");
    return errors;
  }

  errors.push(
    ...input.entries.flatMap((entry, index) =>
      validateEntry(entry, index)
    ),
  );

  const ids = input.entries
    .filter(record)
    .map((entry) => entry.id)
    .filter(nonEmpty);
  const repeated = duplicate(ids);
  if (repeated) {
    errors.push("Duplicate invariant registry id: " + repeated + ".");
  }

  return errors;
}

export function parseInvariantRegistrySnapshot(
  input: unknown,
): InvariantRegistrySnapshot {
  const errors = validateInvariantRegistrySnapshot(input);
  if (errors.length > 0) {
    throw new Error(
      "Invalid invariant registry snapshot: " + errors.join("; "),
    );
  }
  return input as InvariantRegistrySnapshot;
}

export function assertInvariantRegistrySnapshot(
  input: unknown,
): asserts input is InvariantRegistrySnapshot {
  parseInvariantRegistrySnapshot(input);
}

export function invariantRegistryEntryIds(
  snapshot: InvariantRegistrySnapshot,
): readonly InvariantRegistryEntry["id"][] {
  return snapshot.entries.map((entry) => entry.id).sort();
}
