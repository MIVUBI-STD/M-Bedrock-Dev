import type {
  CausalChain,
  CausalIncident,
  RootCauseCandidate,
} from "../../project-model/src/causal-chain.js";
import type {
  DiagnosticRepairDecision,
} from "../../project-model/src/diagnostic-decision.js";
import type {
  InvariantRegistryEntry,
  InvariantRegistrySnapshot,
} from "../../project-model/src/invariant-registry.js";

export interface RepairInvariantDerivation {
  incidentId: string;
  candidateId?: string;
  chainIds: readonly string[];
  relationIds: readonly string[];
  invariantIds: readonly string[];
  missingChainIds: readonly string[];
  unsupportedRelationIds: readonly string[];
  automaticSelectionAllowed: boolean;
  reasons: readonly string[];
}

function selectedCandidate(
  incident: CausalIncident,
  decision: DiagnosticRepairDecision,
): RootCauseCandidate | undefined {
  if (!decision.selectedCandidateId) return undefined;
  return incident.rootCauseCandidates.find(
    (candidate) =>
      candidate.id === decision.selectedCandidateId,
  );
}

function invariantByRelation(
  registry: InvariantRegistrySnapshot,
): ReadonlyMap<string, readonly InvariantRegistryEntry[]> {
  const grouped = new Map<string, InvariantRegistryEntry[]>();

  for (const entry of registry.entries) {
    if (entry.source.kind !== "knowledge-relation") continue;
    const list = grouped.get(entry.source.id) ?? [];
    list.push(entry);
    grouped.set(entry.source.id, list);
  }

  return new Map(
    [...grouped.entries()].map(([relationId, entries]) => [
      relationId,
      entries.sort((a, b) => a.id.localeCompare(b.id)),
    ]),
  );
}

export function deriveRepairInvariants(
  incident: CausalIncident,
  decision: DiagnosticRepairDecision,
  chains: readonly CausalChain[],
  registry: InvariantRegistrySnapshot,
): RepairInvariantDerivation {
  if (decision.incidentId !== incident.id) {
    throw new Error(
      "Diagnostic repair decision does not belong to the causal incident.",
    );
  }

  const candidate = selectedCandidate(incident, decision);
  if (!candidate) {
    return {
      incidentId: incident.id,
      ...(decision.selectedCandidateId === undefined
        ? {}
        : { candidateId: decision.selectedCandidateId }),
      chainIds: [],
      relationIds: [],
      invariantIds: [],
      missingChainIds: [],
      unsupportedRelationIds: [],
      automaticSelectionAllowed: false,
      reasons: [
        decision.selectedCandidateId === undefined
          ? "Diagnostic decision has no selected root-cause candidate."
          : "Selected root-cause candidate is not present in the causal incident.",
      ],
    };
  }

  const chainById = new Map(
    chains.map((chain) => [chain.id, chain]),
  );
  const chainIds = [...new Set(candidate.chainIds)].sort();
  const missingChainIds = chainIds.filter(
    (id) => !chainById.has(id),
  );

  const selectedChains = chainIds
    .map((id) => chainById.get(id))
    .filter((chain): chain is CausalChain => chain !== undefined);

  const relationIds = [
    ...new Set(
      selectedChains.flatMap((chain) =>
        chain.links
          .map((link) => link.relationId)
          .filter(
            (id): id is string =>
              typeof id === "string" &&
              id.trim().length > 0,
          )
      ),
    ),
  ].sort();

  const byRelation = invariantByRelation(registry);
  const invariantIds: string[] = [];
  const unsupportedRelationIds: string[] = [];
  const reasons: string[] = [];

  for (const relationId of relationIds) {
    const invariants = byRelation.get(relationId) ?? [];
    const executable = invariants.filter(
      (entry) =>
        entry.enforcement !== "diagnostic-only",
    );

    if (executable.length === 0) {
      unsupportedRelationIds.push(relationId);
      continue;
    }

    invariantIds.push(
      ...executable.map((entry) => entry.id),
    );
  }

  if (missingChainIds.length > 0) {
    reasons.push(
      "Selected root-cause candidate references unavailable causal chain(s): " +
        missingChainIds.join(", ") +
        ".",
    );
  }

  if (relationIds.length === 0) {
    reasons.push(
      "Selected causal chain(s) contain no knowledge relation provenance; required repair invariants cannot be derived automatically.",
    );
  }

  if (unsupportedRelationIds.length > 0) {
    reasons.push(
      "Selected causal relation(s) have no executable invariant in the active registry: " +
        unsupportedRelationIds.join(", ") +
        ".",
    );
  }

  const uniqueInvariantIds = [
    ...new Set(invariantIds),
  ].sort();

  if (
    relationIds.length > 0 &&
    uniqueInvariantIds.length === 0 &&
    unsupportedRelationIds.length === 0
  ) {
    reasons.push(
      "No executable invariant is attributable to the selected root cause.",
    );
  }

  return {
    incidentId: incident.id,
    candidateId: candidate.id,
    chainIds,
    relationIds,
    invariantIds: uniqueInvariantIds,
    missingChainIds,
    unsupportedRelationIds:
      [...new Set(unsupportedRelationIds)].sort(),
    automaticSelectionAllowed:
      missingChainIds.length === 0 &&
      relationIds.length > 0 &&
      unsupportedRelationIds.length === 0 &&
      uniqueInvariantIds.length > 0,
    reasons,
  };
}
