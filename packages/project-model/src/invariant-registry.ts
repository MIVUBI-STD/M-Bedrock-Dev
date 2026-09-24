import type {
  DiagnosticClaimStrength,
} from "./diagnostic-decision.js";
import type {
  RuntimeEvidenceState,
  RuntimeScope,
} from "./runtime-evidence.js";
import type {
  RuntimeTemporalRequirement,
} from "./runtime-temporal.js";

export type InvariantRegistrySourceKind =
  | "knowledge-relation"
  | "mined-invariant"
  | "manual-policy";

export type InvariantEnforcementLayer =
  | "static"
  | "runtime-state"
  | "runtime-temporal"
  | "diagnostic-only";

export interface InvariantRegistrySource {
  kind: InvariantRegistrySourceKind;
  id: string;
  revision: string;
}

export interface InvariantRuntimeStateRequirement {
  id: string;
  predicate: string;
  expectedState: Exclude<RuntimeEvidenceState, "unknown">;
  scope?: RuntimeScope;
}

export interface InvariantRegistryEntry {
  id: string;
  source: InvariantRegistrySource;
  enforcement: InvariantEnforcementLayer;
  minimumRepairClaim: DiagnosticClaimStrength;
  stateRequirements: readonly InvariantRuntimeStateRequirement[];
  temporalRequirements: readonly RuntimeTemporalRequirement[];
  revalidationLayers: readonly (
    | "static"
    | "transitive"
    | "runtime"
    | "package"
  )[];
  rationale?: string;
}

export interface InvariantRegistrySnapshot {
  schemaVersion: 1;
  revision: string;
  profileKey: string;
  entries: readonly InvariantRegistryEntry[];
}
