import type {
  DiagnosticFinding,
  DiagnosticCode,
} from "../../../diagnostics/src/index.js";
import type {
  CausalChain,
  CausalIncident,
  DiagnosticRepairDecision,
  InvariantRegistrySnapshot,
  SourceRef,
} from "../../../project-model/src/index.js";
import {
  deriveRepairInvariants,
} from "../repair/repair-invariant-derivation.js";
import type {
  RepairStrategyCausalBinding,
} from "../repair/repair-strategy-selection.js";

export interface RepairOpportunityEnvelope {
  incidentId: string;
  candidateId: string;
  sourceFingerprint: string;
  chainIds: readonly string[];
  relationIds: readonly string[];
  invariantIds: readonly string[];
  diagnosticIds: readonly string[];
  diagnosticCodes: readonly DiagnosticCode[];
  sourceRefs: readonly SourceRef[];
  exactSourceRefs: readonly SourceRef[];
  causalBinding: RepairStrategyCausalBinding;
  targetProfileFingerprints: readonly string[];
  automaticRealizationAllowed: boolean;
  reasons: readonly string[];
}

function sourceRefKey(source: SourceRef): string {
  return [
    source.artifactId,
    source.relativePath,
    source.range?.lineStart ?? "",
    source.range?.lineEnd ?? "",
    source.range?.columnStart ?? "",
    source.range?.columnEnd ?? "",
    source.jsonPointer ?? "",
  ].join("|");
}

function exactSource(source: SourceRef): boolean {
  return (
    source.range?.lineStart !== undefined &&
    source.range.lineEnd !== undefined &&
    source.range.lineStart === source.range.lineEnd
  );
}

export function deriveRepairOpportunityEnvelope(
  incident: CausalIncident,
  chains: readonly CausalChain[],
  diagnostic: DiagnosticRepairDecision,
  diagnostics: readonly DiagnosticFinding[],
  invariantRegistry: InvariantRegistrySnapshot,
  sourceFingerprint: string,
): RepairOpportunityEnvelope {
  if (!sourceFingerprint.trim()) {
    throw new Error(
      "Repair opportunity envelope requires a non-empty source fingerprint.",
    );
  }
  if (diagnostic.incidentId !== incident.id) {
    throw new Error(
      "Repair opportunity diagnostic does not belong to the causal incident.",
    );
  }

  const candidate = incident.rootCauseCandidates.find(
    (item) => item.id === diagnostic.selectedCandidateId,
  );
  if (!candidate) {
    throw new Error(
      "Repair opportunity requires a selected root-cause candidate present in the incident.",
    );
  }

  const derivation = deriveRepairInvariants(
    incident,
    diagnostic,
    chains,
    invariantRegistry,
  );
  const chainById = new Map(
    chains.map((chain) => [chain.id, chain]),
  );
  const diagnosticById = new Map(
    diagnostics.map((finding) => [finding.id, finding]),
  );

  const selectedChains = candidate.chainIds
    .map((id) => chainById.get(id))
    .filter((chain): chain is CausalChain => chain !== undefined);

  const diagnosticIds = [
    ...new Set(candidate.relatedDiagnosticIds),
  ].sort();
  const selectedDiagnostics = diagnosticIds
    .map((id) => diagnosticById.get(id))
    .filter(
      (finding): finding is DiagnosticFinding =>
        finding !== undefined,
    );

  const refs = [
    ...selectedChains.flatMap((chain) =>
      chain.nodes.flatMap((node) => node.sourceRefs ?? [])
    ),
    ...selectedDiagnostics.flatMap((finding) =>
      finding.source === undefined ? [] : [finding.source]
    ),
  ];
  const uniqueRefs = [
    ...new Map(
      refs.map((source) => [sourceRefKey(source), source]),
    ).values(),
  ].sort((a, b) =>
    a.relativePath.localeCompare(b.relativePath) ||
    sourceRefKey(a).localeCompare(sourceRefKey(b))
  );

  const provenance =
    diagnostic.causalProof?.interventionProvenance ?? [];
  const causalBinding: RepairStrategyCausalBinding = {
    interventionIds: [
      ...new Set(
        provenance.map((item) => item.interventionId),
      ),
    ].sort(),
    predicateIds: [
      ...new Set(
        provenance
          .map((item) => item.predicateId)
          .filter((value): value is string => Boolean(value)),
      ),
    ].sort(),
    factorIds: [
      ...new Set(
        provenance.flatMap(
          (item) => item.controlledFactorIds ?? [],
        ),
      ),
    ].sort(),
  };

  const targetProfileFingerprints = [
    ...new Set(
      [
        diagnostic.causalProof?.targetProfileFingerprint,
        ...provenance.map(
          (item) => item.targetProfileFingerprint,
        ),
      ].filter(
        (value): value is string =>
          typeof value === "string" &&
          value.trim().length > 0,
      ),
    ),
  ].sort();

  const missingDiagnosticIds = diagnosticIds.filter(
    (id) => !diagnosticById.has(id),
  );
  const reasons = [
    ...derivation.reasons,
    ...(missingDiagnosticIds.length === 0
      ? []
      : [
          "Selected root-cause candidate references unavailable diagnostic(s): " +
            missingDiagnosticIds.join(", ") +
            ".",
        ]),
    ...(uniqueRefs.length === 0
      ? [
          "No source evidence is attributable to the selected causal candidate.",
        ]
      : []),
  ];

  return {
    incidentId: incident.id,
    candidateId: candidate.id,
    sourceFingerprint,
    chainIds: [...new Set(candidate.chainIds)].sort(),
    relationIds: derivation.relationIds,
    invariantIds: derivation.invariantIds,
    diagnosticIds,
    diagnosticCodes: [
      ...new Set(
        selectedDiagnostics.map((finding) => finding.code),
      ),
    ].sort(),
    sourceRefs: uniqueRefs,
    exactSourceRefs: uniqueRefs.filter(exactSource),
    causalBinding,
    targetProfileFingerprints,
    automaticRealizationAllowed:
      derivation.automaticSelectionAllowed &&
      missingDiagnosticIds.length === 0 &&
      uniqueRefs.length > 0,
    reasons,
  };
}
