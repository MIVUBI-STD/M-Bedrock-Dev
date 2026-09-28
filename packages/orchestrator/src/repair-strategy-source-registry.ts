import { createHash } from "node:crypto";
import type {
  DiagnosticCode,
} from "../../diagnostics/src/index.js";
import type {
  RepairRealizerSourceKind,
} from "./repair-realizer-registry.js";
import type {
  RepairStrategyClass,
} from "./repair-strategy-selection.js";

export type RepairStrategySourceSelectionMode =
  | "causal-auto"
  | "proposal-only";

export interface RepairStrategySourceDefinition {
  id: string;
  version: string;
  kind: Exclude<
    RepairRealizerSourceKind,
    "provider"
  >;
  owner: string;
  deterministic: boolean;
  selectionMode: RepairStrategySourceSelectionMode;
  repairClass: RepairStrategyClass;
  supportedDiagnosticCodes?: readonly DiagnosticCode[];
  supportedPredicateIds?: readonly string[];
  supportedFactorIds?: readonly string[];
  requiresExactSourceEvidence: boolean;
  rationale: string;
}

export interface RepairStrategySourceRegistry {
  schemaVersion: 1;
  sources: readonly RepairStrategySourceDefinition[];
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return "{" +
      Object.keys(record)
        .sort()
        .map((key) =>
          JSON.stringify(key) + ":" + canonicalJson(record[key])
        )
        .join(",") +
      "}";
  }
  return JSON.stringify(value);
}

export function validateRepairStrategySourceRegistry(
  registry: RepairStrategySourceRegistry,
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  if (registry.schemaVersion !== 1) {
    errors.push(
      "Repair strategy source registry schemaVersion must be 1.",
    );
  }

  for (const source of registry.sources) {
    if (!source.id.trim()) {
      errors.push(
        "Repair strategy source id must be non-empty.",
      );
    }
    if (ids.has(source.id)) {
      errors.push(
        "Duplicate repair strategy source id: " +
          source.id +
          ".",
      );
    }
    ids.add(source.id);

    if (!source.version.trim()) {
      errors.push(
        "Repair strategy source " +
          source.id +
          " version must be non-empty.",
      );
    }
    if (!source.owner.trim()) {
      errors.push(
        "Repair strategy source " +
          source.id +
          " owner must be non-empty.",
      );
    }
    if (!source.rationale.trim()) {
      errors.push(
        "Repair strategy source " +
          source.id +
          " rationale must be non-empty.",
      );
    }
    if (
      (source.supportedDiagnosticCodes?.length ?? 0) === 0 &&
      (source.supportedPredicateIds?.length ?? 0) === 0 &&
      (source.supportedFactorIds?.length ?? 0) === 0
    ) {
      errors.push(
        "Repair strategy source " +
          source.id +
          " must declare diagnostic, predicate, or factor applicability.",
      );
    }
    if (
      source.selectionMode === "causal-auto" &&
      !source.deterministic
    ) {
      errors.push(
        "Causal-auto repair strategy source " +
          source.id +
          " must be deterministic.",
      );
    }
  }

  return errors;
}

export function repairStrategySourceRegistryRevision(
  registry: RepairStrategySourceRegistry,
): string {
  const errors =
    validateRepairStrategySourceRegistry(registry);
  if (errors.length > 0) {
    throw new Error(
      "Invalid repair strategy source registry: " +
        errors.join("; "),
    );
  }

  return createHash("sha256")
    .update(
      canonicalJson({
        schemaVersion: registry.schemaVersion,
        sources: [...registry.sources].sort((a, b) =>
          a.id.localeCompare(b.id) ||
          a.version.localeCompare(b.version)
        ),
      }),
    )
    .digest("hex");
}

export const BUILTIN_REPAIR_STRATEGY_SOURCES:
  RepairStrategySourceRegistry = {
    schemaVersion: 1,
    sources: [{
      id: "scheduler-generation-guard-template",
      version: "1",
      kind: "built-in-planner",
      owner:
        "analyzers/scripts/src/repair-transform-hints.ts",
      deterministic: true,
      selectionMode: "causal-auto",
      repairClass: "implementation-repair",
      supportedPredicateIds: [
        "stale-callback-observed",
      ],
      supportedFactorIds: [
        "generation-guard-enabled",
      ],
      requiresExactSourceEvidence: true,
      rationale:
        "Exact scheduler generation guard insertion is allowed only when the script analyzer emits a validated single-line source-transform hint from an explicit captured generation token.",
    }, {
      id: "session-generation-guard-template",
      version: "2",
      kind: "built-in-planner",
      owner:
        "analyzers/scripts/src/repair-transform-hints.ts",
      deterministic: true,
      selectionMode: "causal-auto",
      repairClass: "implementation-repair",
      supportedPredicateIds: [
        "stale-session-mutation-observed",
        "stale-life-join-mutation-observed",
        "stale-join-transition-observed",
      ],
      supportedFactorIds: [
        "connection-generation-guard-enabled",
        "life-generation-guard-enabled",
        "membership-guard-enabled",
      ],
      requiresExactSourceEvidence: true,
      rationale:
        "Allows exact connection/life/participation generation guard insertion only when the script analyzer emits a validated captured-generation transform hint.",
    }, {
      id: "persistence-idempotency-guard-template",
      version: "1",
      kind: "built-in-planner",
      owner:
        "analyzers/scripts/src/repair-transform-hints.ts",
      deterministic: true,
      selectionMode: "causal-auto",
      repairClass: "implementation-repair",
      supportedPredicateIds: [
        "duplicate-apply-after-reload-observed",
      ],
      supportedFactorIds: [
        "idempotent-recovery-enabled",
      ],
      requiresExactSourceEvidence: true,
      rationale:
        "Allows exact replay/idempotency guard insertion only when the script analyzer proves an authored applied-generation marker around the side effect.",
    }, {
      id: "arena-ownership-guard-template",
      version: "1",
      kind: "built-in-planner",
      owner:
        "packages/orchestrator/src/repair-strategy-source-registry.ts",
      deterministic: false,
      selectionMode: "proposal-only",
      repairClass: "implementation-repair",
      supportedPredicateIds: [
        "arena-capacity-overflow-observed",
        "arena-start-ownership-violation-observed",
      ],
      supportedFactorIds: [
        "capacity-guard-enabled",
        "start-ownership-guard-enabled",
      ],
      requiresExactSourceEvidence: true,
      rationale:
        "Represents atomic arena capacity/start ownership repairs without inventing a patch before exact source syntax is understood.",
    }, {
      id: "navigation-recovery-configuration",
      version: "1",
      kind: "runtime-recovery-mitigation",
      owner:
        "packages/orchestrator/src/repair-strategy-source-registry.ts",
      deterministic: false,
      selectionMode: "proposal-only",
      repairClass: "runtime-recovery-mitigation",
      supportedPredicateIds: [
        "movement-resumed-after-recovery",
      ],
      supportedFactorIds: [
        "recovery-enabled",
      ],
      requiresExactSourceEvidence: false,
      rationale:
        "Represents bounded path-anchor recovery configuration. Proposal-only until a map-specific authored recovery surface is resolved.",
    }, {
      id: "profile-compatibility-workaround",
      version: "1",
      kind: "compatibility-workaround",
      owner:
        "packages/orchestrator/src/repair-strategy-source-registry.ts",
      deterministic: false,
      selectionMode: "proposal-only",
      repairClass: "compatibility-workaround",
      supportedDiagnosticCodes: [
        "SCRIPT_API_VERSION_INCOMPATIBLE",
        "SCRIPT_API_SIGNATURE_INCOMPATIBLE",
      ],
      requiresExactSourceEvidence: true,
      rationale:
        "Represents target-profile compatibility workarounds without treating profile divergence as an authored defect.",
    }],
  };
