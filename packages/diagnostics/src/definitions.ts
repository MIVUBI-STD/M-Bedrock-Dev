import type { DiagnosticCode } from "./types.js";

export type DiagnosticDefinitionCategory =
  | "reference"
  | "manifest"
  | "command"
  | "state"
  | "topology"
  | "arena"
  | "education"
  | "script"
  | "structure"
  | "entity"
  | "dialogue"
  | "knowledge"
  | "runtime-evidence"
  | "semantic-ir";

export type DiagnosticEvidenceBoundary =
  | "static"
  | "compatibility"
  | "knowledge"
  | "runtime-evidence"
  | "semantic-model";

export interface DiagnosticDefinition {
  code: DiagnosticCode;
  title: string;
  category: DiagnosticDefinitionCategory;
  evidenceBoundary: DiagnosticEvidenceBoundary;
  severityAuthority: "finding";
}

function titleFromCode(code: DiagnosticCode): string {
  return code
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function categoryFor(code: DiagnosticCode): DiagnosticDefinitionCategory {
  if (code === "UNRESOLVED_REFERENCE" || code === "AMBIGUOUS_REFERENCE") return "reference";
  if (
    code === "DUPLICATE_MANIFEST_UUID" ||
    code === "PACK_IDENTITY_DRIFT" ||
    code === "RELEASE_IDENTITY_INCONSISTENT"
  ) return "manifest";
  if (
    code === "ARENA_REPLICA_DIVERGENCE" ||
    code === "ARENA_SPATIAL_FINGERPRINT_DIVERGENCE" ||
    code === "ARENA_VOXEL_DIVERGENCE" ||
    code === "ARENA_CONCURRENCY_CAPACITY_SHORTFALL"
  ) return "arena";
  if (code === "UNKNOWN_COMMAND_EFFECT") return "command";
  if (code === "SUSPICIOUS_REGION_MUTATION" || code === "CROSS_SCOPE_STATE_RISK") return "state";
  if (code === "TOPOLOGY_TRANSLATION_OUTLIER") return "topology";
  if (code.startsWith("EDUCATION_")) return "education";
  if (code.startsWith("SCRIPT_")) return "script";
  if (code.startsWith("STRUCTURE_") || code === "CHUNK_LIFECYCLE_RUNTIME_RISK") return "structure";
  if (code.startsWith("ENTITY_")) return "entity";
  if (code.startsWith("DIALOGUE_")) return "dialogue";
  if (code.startsWith("KNOWLEDGE_")) return "knowledge";
  if (code.startsWith("TELEMETRY_") || code.startsWith("RUNTIME_PROBE_")) return "runtime-evidence";
  return "semantic-ir";
}

function boundaryFor(code: DiagnosticCode): DiagnosticEvidenceBoundary {
  if (
    code.startsWith("TELEMETRY_") ||
    code.startsWith("RUNTIME_PROBE_") ||
    code === "CHUNK_LIFECYCLE_RUNTIME_RISK" ||
    code === "ENTITY_RUNTIME_BEHAVIOR_LIMIT" ||
    code === "STRUCTURE_LOAD_PROBABILISTIC_RUNTIME_CONTENT"
  ) {
    return "runtime-evidence";
  }

  if (
    code.startsWith("EDUCATION_") ||
    code.startsWith("SCRIPT_API_")
  ) {
    return "compatibility";
  }

  if (
    code.startsWith("KNOWLEDGE_") ||
    code.startsWith("ENTITY_KNOWLEDGE_")
  ) {
    return "knowledge";
  }

  if (code.startsWith("SEMANTIC_IR_")) {
    return "semantic-model";
  }

  return "static";
}

export function diagnosticDefinition(
  code: DiagnosticCode,
): DiagnosticDefinition {
  return {
    code,
    title: titleFromCode(code),
    category: categoryFor(code),
    evidenceBoundary: boundaryFor(code),
    severityAuthority: "finding",
  };
}

export function diagnosticDefinitions(
  codes: readonly DiagnosticCode[],
): DiagnosticDefinition[] {
  return [...new Set(codes)]
    .sort()
    .map((code) => diagnosticDefinition(code));
}
