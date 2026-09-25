import { createHash } from "node:crypto";
import type {
  CompiledDiagnosticInvariant,
} from "../../knowledge/src/index.js";
import type {
  InvariantRegistryEntry,
  InvariantRegistrySnapshot,
} from "../../project-model/src/index.js";
import {
  assertInvariantRegistrySnapshot,
} from "../../project-model/src/index.js";
import type { RuntimeScope } from "../../project-model/src/index.js";

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return "{" +
      Object.keys(record)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(record[key]))
        .join(",") +
      "}";
  }
  return JSON.stringify(value);
}

function runtimeEntry(
  invariant: CompiledDiagnosticInvariant,
  knowledgeRevision: string,
  scope?: RuntimeScope,
): InvariantRegistryEntry {
  const source = {
    kind: "knowledge-relation" as const,
    id: invariant.relationId,
    revision: knowledgeRevision,
  };

  if (
    invariant.classification === "open-assumption" ||
    invariant.invariantKind === "requires-any-state"
  ) {
    return {
      id: invariant.id,
      source,
      enforcement: "diagnostic-only",
      minimumRepairClaim: "hypothesis",
      stateRequirements: [],
      temporalRequirements: [],
      revalidationLayers: ["static"],
      ...(invariant.rationale === undefined
        ? {}
        : { rationale: invariant.rationale }),
    };
  }

  if (invariant.invariantKind === "temporal-order") {
    if (!invariant.beforePredicate || !invariant.afterPredicate) {
      return {
        id: invariant.id,
        source,
        enforcement: "diagnostic-only",
        minimumRepairClaim: "hypothesis",
        stateRequirements: [],
        temporalRequirements: [],
        revalidationLayers: ["static"],
        rationale:
          invariant.rationale ??
          "Temporal invariant is incomplete and cannot be executed safely.",
      };
    }

    return {
      id: invariant.id,
      source,
      enforcement: "runtime-temporal",
      minimumRepairClaim: "proven-runtime",
      stateRequirements: [],
      temporalRequirements: [{
        id: invariant.id,
        beforePredicate: invariant.beforePredicate,
        afterPredicate: invariant.afterPredicate,
        ...(scope === undefined ? {} : { scope }),
      }],
      revalidationLayers: [
        "static",
        "transitive",
        "runtime",
        "package",
      ],
      ...(invariant.rationale === undefined
        ? {}
        : { rationale: invariant.rationale }),
    };
  }

  if (invariant.expectedObjectState) {
    return {
      id: invariant.id,
      source,
      enforcement: "runtime-state",
      minimumRepairClaim: "proven-runtime",
      stateRequirements: [{
        id: invariant.id,
        predicate: invariant.object,
        expectedState: invariant.expectedObjectState,
        ...(scope === undefined ? {} : { scope }),
      }],
      temporalRequirements: [],
      revalidationLayers: [
        "static",
        "transitive",
        "runtime",
        "package",
      ],
      ...(invariant.rationale === undefined
        ? {}
        : { rationale: invariant.rationale }),
    };
  }

  return {
    id: invariant.id,
    source,
    enforcement: "diagnostic-only",
    minimumRepairClaim: "hypothesis",
    stateRequirements: [],
    temporalRequirements: [],
    revalidationLayers: ["static"],
    rationale:
      invariant.rationale ??
      "Invariant has no lossless executable runtime mapping.",
  };
}

export function materializeInvariantRegistry(
  invariants: readonly CompiledDiagnosticInvariant[],
  options: {
    knowledgeRevision: string;
    profileKey: string;
    scope?: RuntimeScope;
  },
): InvariantRegistrySnapshot {
  const entries = invariants
    .map((invariant) =>
      runtimeEntry(
        invariant,
        options.knowledgeRevision,
        options.scope,
      )
    )
    .sort((a, b) => a.id.localeCompare(b.id));

  const revision = createHash("sha256")
    .update(canonicalJson({
      knowledgeRevision: options.knowledgeRevision,
      profileKey: options.profileKey,
      entries,
    }))
    .digest("hex");

  const snapshot: InvariantRegistrySnapshot = {
    schemaVersion: 1,
    revision,
    profileKey: options.profileKey,
    entries,
  };
  assertInvariantRegistrySnapshot(snapshot);
  return snapshot;
}
