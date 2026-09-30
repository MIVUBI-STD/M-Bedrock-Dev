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
      id: "arena-capacity-guard-template",
      version: "1",
      kind: "built-in-planner",
      owner:
        "analyzers/scripts/src/arena-repair-transform-hints.ts",
      deterministic: true,
      selectionMode: "causal-auto",
      repairClass: "implementation-repair",
      supportedPredicateIds: [
        "arena-capacity-overflow-observed",
      ],
      supportedFactorIds: [
        "capacity-guard-enabled",
      ],
      requiresExactSourceEvidence: true,
      rationale:
        "Allows a terminal membership capacity guard only when the script analyzer proves a two-statement authored arena path with a direct capacity operand and no intervening side effects.",
    }, {
      id: "arena-ownership-guard-template",
      version: "3",
      kind: "built-in-planner",
      owner:
        "analyzers/scripts/src/arena-repair-transform-hints.ts",
      deterministic: true,
      selectionMode: "causal-auto",
      repairClass: "implementation-repair",
      supportedPredicateIds: [
        "arena-start-ownership-violation-observed",
      ],
      supportedFactorIds: [
        "start-ownership-guard-enabled",
      ],
      requiresExactSourceEvidence: true,
      rationale:
        "Allows exact start-owner acquisition guards only when the script analyzer proves an authored null/undefined owner sentinel, current generation token, owner assignment, and start-state commit in one side-effect-free method path.",
    }, {
      id: "arena-replica-remediation",
      version: "1",
      kind: "built-in-planner",
      owner:
        "packages/orchestrator/src/repair-strategy-source-registry.ts",
      deterministic: false,
      selectionMode: "proposal-only",
      repairClass: "implementation-repair",
      supportedDiagnosticCodes: [
        "ARENA_REPLICA_DIVERGENCE",
        "ARENA_SPATIAL_FINGERPRINT_DIVERGENCE",
        "ARENA_VOXEL_DIVERGENCE",
        "ARENA_BLOCK_ENTITY_DIVERGENCE",
        "ARENA_ENTITY_POPULATION_DIVERGENCE",
        "ARENA_TICK_STATE_DIVERGENCE",
        "ARENA_STRUCTURE_INSTANCE_DIVERGENCE",
      ],
      requiresExactSourceEvidence: false,
      rationale:
        "Routes proven arena replica divergence into authored-source localization and bounded remediation planning. Proposal-only because physical/world-state divergence alone does not identify a safe mutation surface.",
    }, {
      id: "arena-capacity-remediation",
      version: "1",
      kind: "built-in-planner",
      owner:
        "packages/orchestrator/src/repair-strategy-source-registry.ts",
      deterministic: false,
      selectionMode: "proposal-only",
      repairClass: "implementation-repair",
      supportedDiagnosticCodes: [
        "ARENA_CONCURRENCY_CAPACITY_SHORTFALL",
      ],
      requiresExactSourceEvidence: false,
      rationale:
        "Routes proven arena capacity shortfall toward backend selection, lease reduction, queueing, or authored capacity guard localization. Proposal-only until the exact limiting resource ownership path is localized.",
    }, {
      id: "combat-revive-remediation",
      version: "1",
      kind: "built-in-planner",
      owner:
        "packages/orchestrator/src/repair-strategy-source-registry.ts",
      deterministic: false,
      selectionMode: "proposal-only",
      repairClass: "implementation-repair",
      supportedDiagnosticCodes: [
        "COMBAT_REVIVE_POLICY_VIOLATION",
      ],
      requiresExactSourceEvidence: false,
      rationale:
        "Routes observed revive transaction anomalies toward life-generation ownership, reviver eligibility, exclusive revive-owner, and death-terminal review. Proposal-only because telemetry identifies the violated transaction semantics but not one universally safe source mutation.",
    }, {
      id: "arena-lifecycle-remediation",
      version: "1",
      kind: "built-in-planner",
      owner:
        "packages/orchestrator/src/repair-strategy-source-registry.ts",
      deterministic: false,
      selectionMode: "proposal-only",
      repairClass: "implementation-repair",
      supportedDiagnosticCodes: [
        "ARENA_LIFECYCLE_COVERAGE_GAP",
      ],
      requiresExactSourceEvidence: false,
      rationale:
        "Routes unresolved arena terminal convergence and cleanup obligations toward membership release, generation invalidation, resource cleanup, and terminal-path review. Proposal-only because lifecycle coverage alone does not identify one universally safe source mutation.",
    }, {
      id: "entity-ai-navigation-remediation",
      version: "1",
      kind: "built-in-planner",
      owner:
        "packages/orchestrator/src/repair-strategy-source-registry.ts",
      deterministic: false,
      selectionMode: "proposal-only",
      repairClass: "implementation-repair",
      supportedDiagnosticCodes: [
        "ENTITY_AI_NAVIGATION_COVERAGE_GAP",
      ],
      requiresExactSourceEvidence: false,
      rationale:
        "Routes static AI-stack and route-environment coverage gaps toward movement/navigation/goal ownership, active-state binding, route capability, crowding, and bounded recovery review. Proposal-only because entity AI remediation is state- and map-specific.",
    }, {
      id: "inventory-lifecycle-remediation",
      version: "1",
      kind: "built-in-planner",
      owner:
        "packages/orchestrator/src/repair-strategy-source-registry.ts",
      deterministic: false,
      selectionMode: "proposal-only",
      repairClass: "implementation-repair",
      supportedDiagnosticCodes: [
        "INVENTORY_POLICY_CONFLICT",
        "INVENTORY_LIFECYCLE_COVERAGE_GAP",
      ],
      requiresExactSourceEvidence: false,
      rationale:
        "Routes inventory policy conflicts and lifecycle coverage gaps toward reset ownership, equipment reconciliation, ItemStack writeback, restore ownership, and drop-policy review. Proposal-only because inventory semantics are gameplay-authored and current evidence does not identify one universally safe source mutation.",
    }, {
      id: "spatial-authority-remediation",
      version: "1",
      kind: "built-in-planner",
      owner:
        "packages/orchestrator/src/repair-strategy-source-registry.ts",
      deterministic: false,
      selectionMode: "proposal-only",
      repairClass: "implementation-repair",
      supportedDiagnosticCodes: [
        "SPATIAL_AUTHORITY_POLICY_GAP",
      ],
      requiresExactSourceEvidence: false,
      rationale:
        "Routes spatial authority conflicts and uncovered actor/action/region requirements toward authored policy completion or source-policy alignment review. Proposal-only because permission semantics are gameplay-authored and do not identify one universally safe mutation.",
    }, {
      id: "economy-policy-remediation",
      version: "1",
      kind: "built-in-planner",
      owner:
        "packages/orchestrator/src/repair-strategy-source-registry.ts",
      deterministic: false,
      selectionMode: "proposal-only",
      repairClass: "implementation-repair",
      supportedDiagnosticCodes: [
        "ECONOMY_POLICY_CONFLICT",
        "ECONOMY_POLICY_COVERAGE_GAP",
      ],
      requiresExactSourceEvidence: false,
      rationale:
        "Routes authored economy conflicts and coverage gaps toward reward-source arbitration, entitlement correlation, idempotency, pickup reconciliation, inventory-full handling, and stale-drop cleanup review. Proposal-only because these gameplay semantics do not identify one universally safe source mutation.",
    }, {
      id: "chunk-lifecycle-remediation",
      version: "1",
      kind: "built-in-planner",
      owner:
        "packages/orchestrator/src/repair-strategy-source-registry.ts",
      deterministic: false,
      selectionMode: "proposal-only",
      repairClass: "implementation-repair",
      supportedDiagnosticCodes: [
        "CHUNK_LIFECYCLE_RUNTIME_RISK",
        "CHUNK_LIFECYCLE_SOURCE_RISK",
      ],
      requiresExactSourceEvidence: false,
      rationale:
        "Routes chunk lifecycle risk toward loader/readiness evidence, lease ownership, cleanup/reconciliation, and generation-guard review. Proposal-only because a chunk lifecycle risk does not identify one safe source mutation surface.",
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
