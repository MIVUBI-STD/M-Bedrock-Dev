import { createHash } from "node:crypto";
import type {
  RepairStrategyClass,
} from "./repair-strategy-selection.js";

export type RepairRealizerSourceKind =
  | "provider"
  | "built-in-planner"
  | "configuration-template"
  | "compatibility-workaround"
  | "runtime-recovery-mitigation";

export interface RepairRealizerDefinition {
  id: string;
  version: string;
  sourceKind: RepairRealizerSourceKind;
  sourceId: string;
  owner: string;
  deterministic: boolean;
  repairClass: RepairStrategyClass;
  rationale: string;
}

export interface RepairRealizerRegistry {
  schemaVersion: 1;
  realizers: readonly RepairRealizerDefinition[];
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

export function validateRepairRealizerRegistry(
  registry: RepairRealizerRegistry,
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const sourceBindings = new Set<string>();

  if (registry.schemaVersion !== 1) {
    errors.push("Repair realizer registry schemaVersion must be 1.");
  }

  for (const realizer of registry.realizers) {
    if (!realizer.id.trim()) {
      errors.push("Repair realizer id must be non-empty.");
    }
    if (ids.has(realizer.id)) {
      errors.push(
        "Duplicate repair realizer id: " +
          realizer.id +
          ".",
      );
    }
    ids.add(realizer.id);

    if (!realizer.version.trim()) {
      errors.push(
        "Repair realizer " +
          realizer.id +
          " version must be non-empty.",
      );
    }
    if (!realizer.sourceId.trim()) {
      errors.push(
        "Repair realizer " +
          realizer.id +
          " sourceId must be non-empty.",
      );
    }
    if (!realizer.owner.trim()) {
      errors.push(
        "Repair realizer " +
          realizer.id +
          " owner must be non-empty.",
      );
    }
    if (!realizer.rationale.trim()) {
      errors.push(
        "Repair realizer " +
          realizer.id +
          " rationale must be non-empty.",
      );
    }
    if (!realizer.deterministic) {
      errors.push(
        "Registered automatic repair realizer " +
          realizer.id +
          " must be deterministic.",
      );
    }

    const binding =
      realizer.sourceKind + ":" + realizer.sourceId;
    if (sourceBindings.has(binding)) {
      errors.push(
        "Multiple repair realizers bind the same source: " +
          binding +
          ".",
      );
    }
    sourceBindings.add(binding);
  }

  return errors;
}

export function repairRealizerRegistryRevision(
  registry: RepairRealizerRegistry,
): string {
  const errors = validateRepairRealizerRegistry(registry);
  if (errors.length > 0) {
    throw new Error(
      "Invalid repair realizer registry: " +
        errors.join("; "),
    );
  }

  const normalized = {
    schemaVersion: registry.schemaVersion,
    realizers: [...registry.realizers].sort((a, b) =>
      a.id.localeCompare(b.id) ||
      a.version.localeCompare(b.version)
    ),
  };

  return createHash("sha256")
    .update(canonicalJson(normalized))
    .digest("hex");
}

export function repairRealizerForSource(
  registry: RepairRealizerRegistry,
  sourceKind: RepairRealizerSourceKind,
  sourceId: string,
): RepairRealizerDefinition | undefined {
  return registry.realizers.find(
    (item) =>
      item.sourceKind === sourceKind &&
      item.sourceId === sourceId,
  );
}

export const BUILTIN_REPAIR_REALIZERS:
  RepairRealizerRegistry = {
    schemaVersion: 1,
    realizers: [{
      id: "session-generation-guard-realizer",
      version: "1",
      sourceKind: "built-in-planner",
      sourceId: "session-generation-guard-template",
      owner:
        "packages/orchestrator/src/script-transform-hint-realizer.ts",
      deterministic: true,
      repairClass: "implementation-repair",
      rationale:
        "Applies only validated analyzer-owned exact source-transform hints for connection/life/participation generation guards.",
    }, {
      id: "scheduler-generation-guard-realizer",
      version: "1",
      sourceKind: "built-in-planner",
      sourceId: "scheduler-generation-guard-template",
      owner:
        "packages/orchestrator/src/script-transform-hint-realizer.ts",
      deterministic: true,
      repairClass: "implementation-repair",
      rationale:
        "Applies only validated analyzer-owned exact source-transform hints for captured scheduler generation guards.",
    }, {
      id: "persistence-idempotency-guard-realizer",
      version: "1",
      sourceKind: "built-in-planner",
      sourceId: "persistence-idempotency-guard-template",
      owner:
        "packages/orchestrator/src/script-transform-hint-realizer.ts",
      deterministic: true,
      repairClass: "implementation-repair",
      rationale:
        "Applies only analyzer-owned exact source-transform hints backed by an authored applied-generation persistence marker.",
    }, {
      id: "linear-topology-repair-realizer",
      version: "1",
      sourceKind: "provider",
      sourceId: "linear-topology-repair",
      owner:
        "packages/orchestrator/src/topology-repair-strategy-realizer.ts",
      deterministic: true,
      repairClass: "implementation-repair",
      rationale:
        "Realizes repairable absolute-coordinate topology outliers through the deterministic topology planner.",
    }],
  };
