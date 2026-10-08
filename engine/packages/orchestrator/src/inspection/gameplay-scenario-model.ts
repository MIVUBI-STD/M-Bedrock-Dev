import type {
  GameplayIntentNodeKind,
} from "../../../gameplay-intent/src/index.js";
import type {
  AnalysisKnowledgeDomain,
} from "../../../analysis-planner/src/index.js";
import type { SemanticIr } from "../../../semantic-ir/src/index.js";

export type GameplayKnowledgeDomain = AnalysisKnowledgeDomain;

export interface GameplayKnowledgeRequirement {
  readonly id: string;
  readonly scenarioId: string;
  readonly domain: GameplayKnowledgeDomain;
  readonly reason: string;
  readonly capabilityIds: readonly string[];
  readonly dependsOnRequirementIds: readonly string[];
  readonly subjectIds: readonly string[];
  readonly componentIds: readonly string[];
}

export type GameplayKnowledgeReceiptStatus =
  | "SATISFIED"
  | "BLOCKED_BY_PREREQUISITE"
  | "MISSING_REQUIRED_KNOWLEDGE"
  | "CAPABILITY_GAP";

export interface GameplayKnowledgeReceipt {
  readonly requirementId: string;
  readonly scenarioId: string;
  readonly domain: GameplayKnowledgeDomain;
  readonly status: GameplayKnowledgeReceiptStatus;
  readonly evidenceIds: readonly string[];
  /** Exact engine knowledge relations/facts that materially support this scenario requirement. */
  readonly knowledgeIds: readonly string[];
  readonly capabilityIdsUsed: readonly string[];
  readonly subjectIds: readonly string[];
  readonly componentIds: readonly string[];
  readonly reason: string;
}

export interface GameplayRequiredInspectionGraph {
  readonly policy: "required-inspection-graph";
  readonly nodes: readonly GameplayKnowledgeRequirement[];
  readonly receipts: readonly GameplayKnowledgeReceipt[];
}

export type GameplayCausalLinkStatus =
  | "PROVEN"
  | "CONTRADICTED"
  | "RUNTIME_BLOCKED"
  | "DETECTION_GAP";

export interface GameplayScenarioComponent {
  readonly id: string;
  readonly label: string;
  readonly kind:
    | GameplayIntentNodeKind
    | "runtime-domain";
  readonly technicalRole: string;
  readonly gameplayPurpose: string;
  readonly evidenceIds: readonly string[];
  readonly usedByScenarioIds: readonly string[];
  readonly orphan: boolean;
}

export interface GameplayCausalLink {
  readonly id: string;
  readonly scenarioId: string;
  readonly fromComponentId: string;
  readonly toComponentId: string;
  readonly purpose: string;
  readonly evidenceIds: readonly string[];
  readonly subjectIds: readonly string[];
  readonly componentIds: readonly string[];
  /** All scenario knowledge requirements that materially support this dependency. */
  readonly knowledgeRequirementIds: readonly string[];
  /** Proven selected-artifact dependency path from this link toward a player-facing objective/outcome. */
  readonly impactPathComponentIds: readonly string[];
  /** Selected-artifact evidence for every proven edge in impactPathComponentIds. Empty when no complete proven path exists. */
  readonly impactPathEvidenceIds: readonly string[];
  /** Bounded world-model evidence already scoped to this dependency, keyed by proof dimension. */
  readonly dimensionEvidence: Readonly<Partial<Record<"owner" | "generation" | "cleanup" | "geometry" | "capability" | "world-rule" | "activation" | "representation", readonly string[]>>>;
  readonly intentEdgeKind?: import("../../../gameplay-intent/src/index.js").GameplayIntentEdgeKind;
  readonly status: GameplayCausalLinkStatus;
  /** Required only for RUNTIME_BLOCKED; identifies the irreducible native-runtime semantic. */
  readonly runtimeNativeReason?: "client-reconciliation" | "entity-navigation-manifestation" | "network-timing" | "engine-scheduling";
  readonly reason: string;
}

export interface GameplayScenario {
  readonly id: string;
  readonly label: string;
  readonly gameplayStage: string;
  readonly purpose: string;
  readonly sourceSubjectIds: readonly string[];
  readonly componentIds: readonly string[];
  readonly causalLinkIds: readonly string[];
  readonly playerCounts: readonly number[];
  readonly requiredKnowledgeIds: readonly string[];
  readonly composedScenarioIds: readonly string[];
}

export interface GameplayScenarioGraph {
  readonly schemaVersion: 1;
  readonly policy: "scenario-driven-causal-audit";
  readonly scenarios: readonly GameplayScenario[];
  readonly components: readonly GameplayScenarioComponent[];
  readonly causalLinks: readonly GameplayCausalLink[];
  readonly knowledgeRequirements: readonly GameplayKnowledgeRequirement[];
  readonly knowledgeReceipts: readonly GameplayKnowledgeReceipt[];
  readonly requiredInspectionGraph: GameplayRequiredInspectionGraph;
}

export type GameplayScenarioClosureStatus =
  | "CLOSED"
  | "PARTIAL"
  | "OPEN";

export interface GameplayRuntimeProofRequest {
  readonly causalLinkId: string;
  readonly scenarioId: string;
  readonly runtimeReason: string;
  readonly narrowRuntimeQuestion: string;
  readonly evidenceIds: readonly string[];
}

export interface GameplayDetectionGapTestRequest {
  readonly causalLinkId: string;
  readonly scenarioId: string;
  readonly gapReason: string;
  readonly narrowTestQuestion: string;
  readonly evidenceIds: readonly string[];
}

export interface GameplayScenarioClosure {
  readonly status: GameplayScenarioClosureStatus;
  readonly orphanComponentIds: readonly string[];
  readonly missingPurposeComponentIds: readonly string[];
  readonly unresolvedCausalLinkIds: readonly string[];
  readonly runtimeBlockedCausalLinkIds: readonly string[];
  readonly runtimeProofRequests: readonly GameplayRuntimeProofRequest[];
  readonly detectionGapCausalLinkIds: readonly string[];
  readonly detectionGapTestRequests: readonly GameplayDetectionGapTestRequest[];
  readonly missingRequiredKnowledgeIds: readonly string[];
  readonly capabilityGapKnowledgeIds: readonly string[];
  readonly prerequisiteBlockedKnowledgeIds: readonly string[];
  readonly incompleteCompositionScenarioIds: readonly string[];
  /**
   * Leaf scenarios with selected-artifact components but no causal proof edge.
   * These are treated as suspiciously shallow audit coverage.
   */
  readonly unprovenLeafScenarioIds: readonly string[];
  readonly reasons: readonly string[];
}

/**
 * Read-only navigation over the existing scenario graph.
 * No inferred rooms, systems, mechanics, or gameplay claims are created here.
 * IDs point back to their canonical component/causal-link records.
 */
export interface GameplayArchitectureNavigation {
  readonly schemaVersion: 1;
  readonly policy: "derived-gameplay-architecture-navigation";
  readonly stages: readonly {
    readonly name: string;
    readonly scenarioIds: readonly string[];
    readonly componentIds: readonly string[];
    readonly causalLinkIds: readonly string[];
  }[];
  /** Every scenario remains visible within the same map-wide navigation. */
  readonly scenarios: readonly {
    readonly id: string;
    readonly label: string;
    readonly gameplayStage: string;
    readonly purpose: string;
    readonly componentIds: readonly string[];
    readonly causalLinkIds: readonly string[];
    readonly sourceSubjectIds: readonly string[];
  }[];
  readonly components: readonly {
    readonly id: string;
    readonly label: string;
    readonly technicalRole: string;
    readonly gameplayPurpose: string;
    readonly scenarioIds: readonly string[];
    readonly evidenceIds: readonly string[];
  }[];
  readonly causalLinks: readonly {
    readonly id: string;
    readonly fromComponentId: string;
    readonly toComponentId: string;
    readonly purpose: string;
    readonly status: GameplayCausalLinkStatus;
    readonly evidenceIds: readonly string[];
  }[];
  readonly unplacedComponentIds: readonly string[];
  readonly unresolvedCausalLinkIds: readonly string[];
  readonly missingGraphReferenceIds: readonly string[];
  /**
   * Tracks source-scoped Gameplay Intent evidence against existing
   * architecture components/links. Unlinked is not a bug or proof of absence.
   */
  readonly evidenceCoverage: {
    readonly selectedArtifactEvidenceCount: number;
    readonly architectureLinkedEvidenceIds: readonly string[];
    readonly architectureUnlinkedEvidenceIds: readonly string[];
    readonly architectureEvidenceWithoutIntentRecordIds: readonly string[];
    readonly selectedArtifactEvidenceLinkPercent: number | null;
  };
  /**
   * Exact-ID reconciliation of raw Semantic IR records against the existing
   * gameplay architecture. Counts cover parsed IR only, not the whole map.
   * No inferred links from owner names, locations, or surface similarities.
   */
  readonly semanticIrCoverage: {
    readonly stateOperations: {
      readonly observedCount: number;
      readonly linkedIds: readonly string[];
      readonly unlinkedIds: readonly string[];
    };
    readonly executionRegions: {
      readonly observedCount: number;
      readonly linkedIds: readonly string[];
      readonly unlinkedIds: readonly string[];
    };
    readonly executionEdges: {
      readonly observedCount: number;
      readonly linkedIds: readonly string[];
      readonly unlinkedIds: readonly string[];
    };
    readonly temporalRelations: {
      readonly observedCount: number;
      readonly linkedIds: readonly string[];
      readonly unlinkedIds: readonly string[];
    };
  };
  /**
   * Source-grounded system evidence, not a catalog of assumed map features.
   * A count of zero never proves a feature is absent from the full map.
   */
  readonly systemInventory: readonly {
    readonly system: "ENTITY" | "COMBAT" | "INVENTORY" | "ECONOMY" | "PROGRESSION";
    readonly observedCount: number;
    /** Analyzer observations can be source names or reward kinds, not evidence IDs. */
    readonly observationReferences: readonly string[];
    readonly evidenceIds: readonly string[];
    readonly inventoryStatus: "OBSERVED" | "NOT_OBSERVED";
    readonly evidenceLinkedComponentIds: readonly string[];
    readonly unmatchedEvidenceIds: readonly string[];
    readonly architectureMapping: "EVIDENCE_LINKED" | "NOT_YET_RECONCILED";
  }[];
  /**
   * Measured coverage of observed evidence, never a claim about all gameplay.
   * Full-map understanding has no defensible denominator while unidentified
   * source semantics, world content, or design intent can remain unknown.
   */
  readonly knowledgeCoverage: {
    readonly observedSourceIndexPercent: number | null;
    readonly observedComponentPlacementPercent: number | null;
    readonly wholeGameUnderstandingPercent: null;
    readonly wholeGameUnderstandingStatus: "NOT_MEASURABLE";
    readonly observedRelevantSourceCount: number;
    readonly observedIndexedSourceCount: number;
    readonly observedComponentCount: number;
    readonly observedPlacedComponentCount: number;
    readonly arenaEvidence: {
      readonly detected: boolean;
      /** Number of physical arenas inferred from the selected world. */
      readonly count: number | null;
      readonly countBasis: "topology" | "script-config" | "reconciled" | null;
      readonly layoutStatus: string | null;
      /** Only arena identities available from existing replica proof receipts. */
      readonly replicaProofEntries: readonly {
        readonly arenaId: string;
        readonly evidenceIds: readonly string[];
        readonly proofStatus: string;
      }[];
      /** Numeric coverage gap, not proof of absent arena instances. */
      readonly arenasWithoutReplicaProofCount: number | null;
      /** Configured limit, not a verified runtime capacity. */
      readonly declaredConcurrentArenaLimit: number | null;
      /** Requested coverage, not an approved game-design requirement. */
      readonly requestedConcurrentArenas: number | null;
      /** Analysis estimate; never treat as actual runtime outcome. */
      readonly safeConcurrentArenas: number | null;
      readonly perArenaPlayerCapacity: number | null;
      readonly architectureMapping: "NOT_YET_RECONCILED";
      /** These observations are arena-related, but not bound to specific arena IDs. */
      readonly stateIsolationObservations: readonly {
        readonly scriptId: string;
        readonly region: string;
        readonly key: string;
        readonly status: "isolated" | "partition-proof-required" | "shared-global" | "unknown";
      }[];
      readonly chunkLeases: readonly {
        readonly scriptId: string;
        readonly leaseKey: string | null;
        readonly acquireRegions: readonly string[];
        readonly releaseRegions: readonly string[];
        readonly status: string;
      }[];
      readonly cleanupAssessments: readonly {
        readonly scriptId: string;
        readonly tableName: string;
        readonly status: "complete" | "unresolved";
        readonly missingPhases: readonly string[];
        readonly orderingViolations: readonly string[];
      }[];
      readonly arenaSessionMapping: "NOT_YET_ESTABLISHED";
    };
  };
}

/** Navigation only: preserve gaps rather than fabricating stage or system membership. */
export function deriveGameplayArchitectureNavigation(
  graph: GameplayScenarioGraph,
  observed: {
    readonly relevantSourceCount: number;
    readonly indexedSourceCount: number;
    readonly arenaDetected: boolean;
    readonly selectedArtifactEvidenceIds?: readonly string[];
    readonly allIntentEvidenceIds?: readonly string[];
    readonly semanticIr?: SemanticIr;
    readonly arenaCount?: number;
    readonly arenaCountBasis?: "topology" | "script-config" | "reconciled";
    readonly arenaLayoutStatus?: string;
    readonly replicaProof?: readonly {
      readonly arenaId: string;
      readonly evidenceIds: readonly string[];
      readonly status: string;
    }[];
    readonly declaredConcurrentArenaLimit?: number;
    readonly requestedConcurrentArenas?: number;
    readonly safeConcurrentArenas?: number | null;
    readonly perArenaPlayerCapacity?: number;
    readonly stateIsolationObservations?: readonly {
      readonly scriptId: string;
      readonly region: string;
      readonly key: string;
      readonly status: "isolated" | "partition-proof-required" | "shared-global" | "unknown";
    }[];
    readonly chunkLeases?: readonly {
      readonly scriptId: string;
      readonly leaseKey?: string;
      readonly acquireRegions: readonly string[];
      readonly releaseRegions: readonly string[];
      readonly status: string;
    }[];
    readonly cleanupAssessments?: readonly {
      readonly scriptId: string;
      readonly tableName: string;
      readonly status: "complete" | "unresolved";
      readonly missingPhases: readonly string[];
      readonly orderingViolations: readonly string[];
    }[];
    readonly systemObservations?: readonly {
      readonly system: "ENTITY" | "COMBAT" | "INVENTORY" | "ECONOMY" | "PROGRESSION";
      readonly observedCount: number;
      readonly observationReferences: readonly string[];
      /** Only canonical evidence IDs positively supplied by the evidence owner. */
      readonly evidenceIds?: readonly string[];
    }[];
  } = {
    relevantSourceCount: 0,
    indexedSourceCount: 0,
    arenaDetected: false,
  },
): GameplayArchitectureNavigation {
  const sorted = (values: readonly string[]) =>
    [...new Set(values)].sort();
  const componentById = new Map(
    graph.components.map((component) => [component.id, component]),
  );
  const linksById = new Map(
    graph.causalLinks.map((link) => [link.id, link]),
  );
  const stageGroups = new Map<
    string,
    { scenarioIds: string[]; componentIds: string[]; causalLinkIds: string[] }
  >();

  for (const scenario of graph.scenarios) {
    const group = stageGroups.get(scenario.gameplayStage) ?? {
      scenarioIds: [], componentIds: [], causalLinkIds: [],
    };
    group.scenarioIds.push(scenario.id);
    group.componentIds.push(...scenario.componentIds);
    group.causalLinkIds.push(...scenario.causalLinkIds);
    stageGroups.set(scenario.gameplayStage, group);
  }

  const missing = new Set<string>();
  for (const scenario of graph.scenarios) {
    for (const id of scenario.componentIds) {
      if (!componentById.has(id)) missing.add(id);
    }
    for (const id of scenario.causalLinkIds) {
      if (!linksById.has(id)) missing.add(id);
    }
  }
  for (const link of graph.causalLinks) {
    if (!componentById.has(link.fromComponentId))
      missing.add(link.fromComponentId);
    if (!componentById.has(link.toComponentId))
      missing.add(link.toComponentId);
  }

  const placed = new Set(
    graph.scenarios.flatMap((scenario) => scenario.componentIds),
  );

  const percentage = (part: number, total: number): number | null =>
    Number.isSafeInteger(part) &&
    Number.isSafeInteger(total) &&
    total > 0 &&
    part >= 0 &&
    part <= total
      ? Math.round((part / total) * 10000) / 100
      : null;
  const placedCount = graph.components.filter((component) =>
    placed.has(component.id)
  ).length;
  const sourceEvidence = sorted(observed.selectedArtifactEvidenceIds ?? []);
  const intentEvidence = new Set(observed.allIntentEvidenceIds ?? []);
  const architectureEvidence = sorted([
    ...graph.components.flatMap((component) => component.evidenceIds),
    ...graph.causalLinks.flatMap((link) => link.evidenceIds),
  ]);
  const linkedEvidence = sourceEvidence.filter((id) =>
    architectureEvidence.includes(id)
  );
  const architectureEvidenceSet = new Set(architectureEvidence);
  const irAccounting = (ids: readonly string[]) => {
    const observedIds = sorted(ids);
    return {
      observedCount: observedIds.length,
      linkedIds: observedIds.filter((id) => architectureEvidenceSet.has(id)),
      unlinkedIds: observedIds.filter((id) => !architectureEvidenceSet.has(id)),
    };
  };
  const arenaInstances = [...new Map(
    (observed.replicaProof ?? []).map((instance) => [
      instance.arenaId, instance,
    ]),
  ).values()].sort((a, b) => a.arenaId.localeCompare(b.arenaId));
  const arenasWithoutReplicaProofCount =
    observed.arenaCount === undefined ||
    !Number.isSafeInteger(observed.arenaCount) ||
    observed.arenaCount < 0 ||
    arenaInstances.length > observed.arenaCount
      ? null
      : observed.arenaCount - arenaInstances.length;


  return {
    schemaVersion: 1,
    policy: "derived-gameplay-architecture-navigation",
    stages: [...stageGroups].sort(([a], [b]) => a.localeCompare(b))
      .map(([name, group]) => ({
        name,
        scenarioIds: sorted(group.scenarioIds),
        componentIds: sorted(group.componentIds),
        causalLinkIds: sorted(group.causalLinkIds),
      })),
    scenarios: [...graph.scenarios].sort((a,b) => a.id.localeCompare(b.id))
      .map((scenario) => ({
        id: scenario.id,
        label: scenario.label,
        gameplayStage: scenario.gameplayStage,
        purpose: scenario.purpose,
        componentIds: sorted(scenario.componentIds),
        causalLinkIds: sorted(scenario.causalLinkIds),
        sourceSubjectIds: sorted(scenario.sourceSubjectIds),
      })),
    components: [...graph.components].sort((a,b) => a.id.localeCompare(b.id))
      .map((component) => ({
        id: component.id,
        label: component.label,
        technicalRole: component.technicalRole,
        gameplayPurpose: component.gameplayPurpose,
        scenarioIds: sorted(component.usedByScenarioIds),
        evidenceIds: sorted(component.evidenceIds),
      })),
    causalLinks: [...graph.causalLinks].sort((a,b) => a.id.localeCompare(b.id))
      .map((link) => ({
        id: link.id,
        fromComponentId: link.fromComponentId,
        toComponentId: link.toComponentId,
        purpose: link.purpose,
        status: link.status,
        evidenceIds: sorted(link.evidenceIds),
      })),
    unplacedComponentIds: sorted(graph.components
      .filter((component) => !placed.has(component.id))
      .map((component) => component.id)),
    unresolvedCausalLinkIds: sorted(graph.causalLinks
      .filter((link) => link.status !== "PROVEN")
      .map((link) => link.id)),
    missingGraphReferenceIds: sorted([...missing]),
    evidenceCoverage: {
      selectedArtifactEvidenceCount: sourceEvidence.length,
      architectureLinkedEvidenceIds: linkedEvidence,
      architectureUnlinkedEvidenceIds: sourceEvidence.filter((id) =>
        !architectureEvidence.includes(id)
      ),
      architectureEvidenceWithoutIntentRecordIds: architectureEvidence.filter(
        (id) => !intentEvidence.has(id)
      ),
      selectedArtifactEvidenceLinkPercent:
        percentage(linkedEvidence.length, sourceEvidence.length),
    },
    semanticIrCoverage: {
      stateOperations: irAccounting(
        observed.semanticIr?.state.operations.map((item) => item.id) ?? [],
      ),
      executionRegions: irAccounting(
        observed.semanticIr?.execution.regions.map((item) => item.id) ?? [],
      ),
      executionEdges: irAccounting(
        observed.semanticIr?.execution.edges.map((item) => item.id) ?? [],
      ),
      temporalRelations: irAccounting(
        observed.semanticIr?.temporal.relations.map((item) => item.id) ?? [],
      ),
    },
    systemInventory: [...(observed.systemObservations ?? [])]
      .sort((a, b) => a.system.localeCompare(b.system))
      .map((observation) => {
        const references = sorted(observation.observationReferences);
        const evidenceIds = sorted(observation.evidenceIds ?? []);
        const matchingComponents = graph.components.filter((component) =>
          component.evidenceIds.some((id) => evidenceIds.includes(id))
        );
        const matchedEvidenceIds = new Set(
          matchingComponents.flatMap((component) =>
            component.evidenceIds.filter((id) => evidenceIds.includes(id))
          ),
        );
        return {
          system: observation.system,
          observedCount: observation.observedCount,
          observationReferences: references,
          evidenceIds,
          inventoryStatus: observation.observedCount > 0
            ? "OBSERVED" as const
            : "NOT_OBSERVED" as const,
          evidenceLinkedComponentIds: sorted(
            matchingComponents.map((component) => component.id)
          ),
          unmatchedEvidenceIds: evidenceIds.filter(
            (id) => !matchedEvidenceIds.has(id)
          ),
          // A match establishes a navigable evidence bridge, not complete
          // system semantics, session ownership, or gameplay correctness.
          architectureMapping: matchedEvidenceIds.size > 0
            ? "EVIDENCE_LINKED" as const
            : "NOT_YET_RECONCILED" as const,
        };
      }),
    knowledgeCoverage: {
      observedSourceIndexPercent:
        percentage(observed.indexedSourceCount, observed.relevantSourceCount),
      observedComponentPlacementPercent:
        percentage(placedCount, graph.components.length),
      wholeGameUnderstandingPercent: null,
      wholeGameUnderstandingStatus: "NOT_MEASURABLE",
      observedRelevantSourceCount: observed.relevantSourceCount,
      observedIndexedSourceCount: observed.indexedSourceCount,
      observedComponentCount: graph.components.length,
      observedPlacedComponentCount: placedCount,
      arenaEvidence: {
        detected: observed.arenaDetected,
        count:
          observed.arenaCount === undefined
            ? null
            : observed.arenaCount,
        countBasis: observed.arenaCountBasis ?? null,
        layoutStatus: observed.arenaLayoutStatus ?? null,
        replicaProofEntries: arenaInstances.map((instance) => ({
          arenaId: instance.arenaId,
          evidenceIds: sorted(instance.evidenceIds),
          proofStatus: instance.status,
        })),
        arenasWithoutReplicaProofCount,
        declaredConcurrentArenaLimit:
          observed.declaredConcurrentArenaLimit ?? null,
        requestedConcurrentArenas:
          observed.requestedConcurrentArenas ?? null,
        safeConcurrentArenas:
          observed.safeConcurrentArenas ?? null,
        perArenaPlayerCapacity:
          observed.perArenaPlayerCapacity ?? null,
        architectureMapping: "NOT_YET_RECONCILED",
        stateIsolationObservations: [...(observed.stateIsolationObservations ?? [])]
          .sort((a,b) => a.scriptId.localeCompare(b.scriptId) ||
            a.region.localeCompare(b.region) || a.key.localeCompare(b.key))
          .map((item) => ({ ...item })),
        chunkLeases: [...(observed.chunkLeases ?? [])]
          .sort((a,b) => a.scriptId.localeCompare(b.scriptId) ||
            (a.leaseKey ?? "").localeCompare(b.leaseKey ?? ""))
          .map((lease) => ({
            scriptId: lease.scriptId,
            leaseKey: lease.leaseKey ?? null,
            acquireRegions: sorted(lease.acquireRegions),
            releaseRegions: sorted(lease.releaseRegions),
            status: lease.status,
          })),
        cleanupAssessments: [...(observed.cleanupAssessments ?? [])]
          .sort((a,b) => a.scriptId.localeCompare(b.scriptId) ||
            a.tableName.localeCompare(b.tableName))
          .map((item) => ({
            scriptId: item.scriptId,
            tableName: item.tableName,
            status: item.status,
            missingPhases: sorted(item.missingPhases),
            orderingViolations: sorted(item.orderingViolations),
          })),
        arenaSessionMapping: "NOT_YET_ESTABLISHED",
      },
    },
  };
}
