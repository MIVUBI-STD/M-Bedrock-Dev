import { createHash } from "node:crypto";
import type { SemanticGraph } from "../../graph/src/graph.js";
import type { KnowledgeCatalog } from "../../knowledge/src/types.js";
import type {
  InvariantRegistrySnapshot,
} from "../../project-model/src/invariant-registry.js";
import type {
  DecisionBasisRevision,
} from "../../project-model/src/decision-ledger.js";
import type {
  RuntimeProbeBinding,
} from "../../project-model/src/runtime-probe.js";
import type { InspectTargetProfile } from "./types.js";
import { semanticGraphFingerprint } from "./semantic-graph-fingerprint.js";

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonical);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, canonical(child)]),
    );
  }
  return value;
}

function fingerprint(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
}

export interface DecisionBasisInput {
  sourceFingerprint?: string;
  graph?: SemanticGraph;
  knowledge?: KnowledgeCatalog;
  invariantRegistry?: InvariantRegistrySnapshot;
  target?: InspectTargetProfile;
  probeBindings?: readonly RuntimeProbeBinding[];
}

export function buildDecisionBasis(
  input: DecisionBasisInput,
): DecisionBasisRevision {
  return {
    ...(input.sourceFingerprint === undefined
      ? {}
      : { sourceFingerprint: input.sourceFingerprint }),
    ...(input.graph === undefined
      ? {}
      : { graphFingerprint: semanticGraphFingerprint(input.graph) }),
    ...(input.knowledge === undefined
      ? {}
      : { knowledgeRevision: fingerprint(input.knowledge) }),
    ...(input.invariantRegistry === undefined
      ? {}
      : {
          invariantRegistryRevision:
            input.invariantRegistry.revision,
        }),
    ...(input.target === undefined
      ? {}
      : { targetProfileFingerprint: fingerprint(input.target) }),
    ...(input.probeBindings === undefined
      ? {}
      : {
          probeBindingRevision: fingerprint(
            [...input.probeBindings].sort((a, b) =>
              a.probeId.localeCompare(b.probeId) ||
              a.predicate.localeCompare(b.predicate)
            ),
          ),
        }),
  };
}
