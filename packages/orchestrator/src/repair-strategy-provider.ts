import { createHash } from "node:crypto";
import type { DiagnosticCode } from "../../diagnostics/src/types.js";
import type { PatchOperation } from "../../repair/src/index.js";
import type { RepairStrategyCandidate } from "./repair-strategy-selection.js";

export type RepairStrategyProviderEvidenceClass =
  | "deterministic-static"
  | "heuristic-static"
  | "runtime-causal";

export type RepairStrategyProviderSelectionMode =
  | "causal-auto"
  | "proposal-only";

export interface RepairStrategyProviderDefinition {
  id: string;
  version: string;
  owner: string;
  deterministic: boolean;
  evidenceClass: RepairStrategyProviderEvidenceClass;
  selectionMode: RepairStrategyProviderSelectionMode;
  supportedDiagnosticCodes: readonly DiagnosticCode[];
  mutationKinds: readonly PatchOperation["kind"][];
  requiresExactSourceEvidence: boolean;
  rationale: string;
}

export interface RepairStrategyProviderRegistry {
  schemaVersion: 1;
  providers: readonly RepairStrategyProviderDefinition[];
}

export interface RepairStrategyProviderProposal {
  providerId: string;
  providerVersion: string;
  relatedDiagnosticIds: readonly string[];
  strategy: RepairStrategyCandidate;
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

function normalizedProviderRegistry(
  registry: RepairStrategyProviderRegistry,
) {
  return {
    schemaVersion: registry.schemaVersion,
    providers: registry.providers
      .map((provider) => ({
        ...provider,
        supportedDiagnosticCodes:
          [...provider.supportedDiagnosticCodes].sort(),
        mutationKinds: [...provider.mutationKinds].sort(),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  };
}

export function repairStrategyProviderRegistryRevision(
  registry: RepairStrategyProviderRegistry,
): string {
  const errors = validateRepairStrategyProviderRegistry(registry);
  if (errors.length > 0) {
    throw new Error(
      "Invalid repair strategy provider registry: " +
        errors.join("; "),
    );
  }

  return createHash("sha256")
    .update(canonicalJson(normalizedProviderRegistry(registry)))
    .digest("hex");
}

export const BUILTIN_REPAIR_STRATEGY_PROVIDERS: RepairStrategyProviderRegistry = {
  schemaVersion: 1,
  providers: [{
    id: "linear-topology-repair",
    version: "1",
    owner: "packages/repair/src/topology-planner.ts",
    deterministic: true,
    evidenceClass: "heuristic-static",
    selectionMode: "proposal-only",
    supportedDiagnosticCodes: [
      "TOPOLOGY_TRANSLATION_OUTLIER",
    ],
    mutationKinds: ["replace-command"],
    requiresExactSourceEvidence: true,
    rationale:
      "Linear topology repair is deterministic once an outlier is accepted, but the topology outlier diagnostic is heuristic and is not currently a causal root-cause proof.",
  }],
};

export function validateRepairStrategyProviderRegistry(
  registry: RepairStrategyProviderRegistry,
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  if (registry.schemaVersion !== 1) {
    errors.push("Repair strategy provider registry schemaVersion must be 1.");
  }

  for (const provider of registry.providers) {
    if (!provider.id.trim()) {
      errors.push("Repair strategy provider id must be non-empty.");
    }
    if (ids.has(provider.id)) {
      errors.push(
        "Duplicate repair strategy provider id: " +
          provider.id +
          ".",
      );
    }
    ids.add(provider.id);

    if (!provider.version.trim()) {
      errors.push(
        "Repair strategy provider " +
          provider.id +
          " version must be non-empty.",
      );
    }
    if (!provider.owner.trim()) {
      errors.push(
        "Repair strategy provider " +
          provider.id +
          " owner must be non-empty.",
      );
    }
    if (provider.supportedDiagnosticCodes.length === 0) {
      errors.push(
        "Repair strategy provider " +
          provider.id +
          " must declare at least one supported diagnostic code.",
      );
    }
    if (provider.mutationKinds.length === 0) {
      errors.push(
        "Repair strategy provider " +
          provider.id +
          " must declare at least one mutation kind.",
      );
    }

    if (!provider.rationale.trim()) {
      errors.push(
        "Repair strategy provider " +
          provider.id +
          " rationale must be non-empty.",
      );
    }

    const repeatedDiagnosticCode =
      provider.supportedDiagnosticCodes.find(
        (code, index, values) =>
          values.indexOf(code) !== index,
      );
    if (repeatedDiagnosticCode) {
      errors.push(
        "Duplicate supported diagnostic code " +
          repeatedDiagnosticCode +
          " in provider " +
          provider.id +
          ".",
      );
    }

    const repeatedMutationKind = provider.mutationKinds.find(
      (kind, index, values) =>
        values.indexOf(kind) !== index,
    );
    if (repeatedMutationKind) {
      errors.push(
        "Duplicate mutation kind " +
          repeatedMutationKind +
          " in provider " +
          provider.id +
          ".",
      );
    }
    if (
      provider.selectionMode === "causal-auto" &&
      (
        !provider.deterministic ||
        provider.evidenceClass === "heuristic-static"
      )
    ) {
      errors.push(
        "Causal-auto repair strategy provider " +
          provider.id +
          " must be deterministic and cannot use heuristic-static evidence.",
      );
    }
  }

  return errors;
}

export function repairStrategyProvider(
  registry: RepairStrategyProviderRegistry,
  providerId: string,
): RepairStrategyProviderDefinition | undefined {
  return registry.providers.find(
    (provider) => provider.id === providerId,
  );
}

export function validateRepairStrategyProviderProposal(
  registry: RepairStrategyProviderRegistry,
  proposal: RepairStrategyProviderProposal,
  options: {
    requireCausalAuto: boolean;
  },
): string[] {
  const errors: string[] = [];
  const provider = repairStrategyProvider(
    registry,
    proposal.providerId,
  );

  if (!provider) {
    return [
      "Unknown repair strategy provider: " +
        proposal.providerId +
        ".",
    ];
  }

  if (proposal.providerVersion !== provider.version) {
    errors.push(
      "Repair strategy provider version mismatch for " +
        provider.id +
        ": expected " +
        provider.version +
        ", received " +
        proposal.providerVersion +
        ".",
    );
  }

  if (
    options.requireCausalAuto &&
    provider.selectionMode !== "causal-auto"
  ) {
    errors.push(
      "Repair strategy provider " +
        provider.id +
        " is proposal-only and cannot enter causal automatic selection.",
    );
  }

  if (
    proposal.strategy.transaction.operations.some(
      (operation) =>
        !provider.mutationKinds.includes(operation.kind),
    )
  ) {
    errors.push(
      "Repair strategy proposal uses mutation operation outside provider declaration.",
    );
  }

  if (
    provider.requiresExactSourceEvidence &&
    proposal.strategy.transaction.operations.some(
      (operation) => {
        const range = operation.source.range;
        return (
          range === undefined ||
          range.lineStart === undefined ||
          range.lineEnd === undefined ||
          range.lineStart !== range.lineEnd
        );
      },
    )
  ) {
    errors.push(
      "Repair strategy provider requires exact single-line source evidence for every mutation.",
    );
  }

  if (proposal.relatedDiagnosticIds.length === 0) {
    errors.push(
      "Repair strategy provider proposal must carry diagnostic provenance.",
    );
  }

  return errors;
}
