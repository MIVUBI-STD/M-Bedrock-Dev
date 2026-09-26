import { createHash } from "node:crypto";
import type {
  RuntimeExperimentDefinition,
} from "./types.js";

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, canonical(child)]),
    );
  }
  return value;
}

export function runtimeExperimentDefinitionRevision(
  definition: RuntimeExperimentDefinition,
): string {
  return createHash("sha256")
    .update(JSON.stringify(canonical(definition)))
    .digest("hex");
}
