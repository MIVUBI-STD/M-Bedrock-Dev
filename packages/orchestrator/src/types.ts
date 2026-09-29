import type { MinecraftEdition } from "../../compatibility/src/index.js";
import type { EducationFeatureState } from "../../compatibility/src/index.js";
import type { DiagnosticFinding } from "../../diagnostics/src/index.js";
import type { MapCompatibilityFingerprint } from "../../reliability/src/index.js";
import type { InspectionRepairCandidate } from "./repair-planning.js";
import type { ScriptApiUsageInventory } from "./script-api-usage.js";
import type { ArenaRegionContract, RouteCorridorContract } from "../../project-model/src/index.js";
import type { StateAuthorityContract } from "../../project-model/src/index.js";
import type { MutationDependentActionContract } from "../../project-model/src/index.js";
import type { CausalChain, CausalIncident } from "../../project-model/src/index.js";
import type { TelemetryEvent } from "../../project-model/src/index.js";
import type { RuntimeProbeResponse } from "../../project-model/src/index.js";
import type { DiagnosticProbeAnalysis } from "./diagnostic-probe-analysis.js";
import type { RuntimeEvidenceIntegrityReport } from "../../project-model/src/index.js";
import type { DecisionBasisRevision } from "../../project-model/src/index.js";
import type { EvidenceRecoveryPlan } from "./evidence-recovery.js";
import type { GameplayIntentModel } from "../../gameplay-intent/src/index.js";
import type { ArenaRegionClassification, ArenaRegionPartitionResult, ArenaRegionPlan, ArenaReplicaDiscovery, ArenaSpatialLayout } from "../../../analyzers/topology/src/index.js";
import type { ArenaNativeSpatialAudit } from "./arena-native-extraction.js";
import type { ArenaVoxelProof } from "./arena-voxel-proof.js";
import type { ArenaBlockEntityProof } from "./arena-block-entity-proof.js";
import type { PersistedPackIdentityExtraction } from "./persisted-pack-identity.js";
import type { ArenaProofCoverageReport } from "./arena-proof-coverage.js";
import type { ArenaProofConclusionReport } from "./arena-proof-conclusion.js";
import type { ArenaReplicaProofQuality } from "./arena-replica-proof-quality.js";
import type { ArenaCapacityExtractionResult } from "./arena-capacity-extraction.js";
import type { ScriptSafeConfigAnalysis } from "./script-safe-config-analysis.js";
import type { ArenaLayoutReconciliation } from "./arena-layout-reconciliation.js";
import type { ArenaLifecycleAnalysis } from "./arena-lifecycle-analysis.js";
import type { ReleaseIdentityAnalysis } from "./release-identity-analysis.js";
import type {
  GameplayIntentRouteRuntimeAssessment,
  GameplayIntentRuntimeAssessment,
  GameplayRouteStallRuntimeAssessment,
} from "./gameplay-intent-runtime-stage.js";

export interface InspectTargetProfile {
  edition?: MinecraftEdition;
  version?: string;
  educationFeatures?: Exclude<EducationFeatureState, "unknown">;
  eduLevel?: number;
  experiments?: readonly string[];
  routeCorridors?: readonly RouteCorridorContract[];
  arenaRegionContracts?: readonly ArenaRegionContract[];
  mutationDependentActions?: readonly MutationDependentActionContract[];
  stateAuthorityContracts?: readonly StateAuthorityContract[];
  authoredSourceRoots?: readonly string[];
  staticExecutionDimension?: string;
  releaseVersion?: string;
}

export interface InspectedPack {
  root: string;
  type: string;
  uuid?: string;
  minEngineVersion?: string;
  packVersion?: string;
  educationMetadata: boolean;
  scriptModules: Array<{
    moduleName: string;
    version: string;
    track: string;
  }>;
}

export interface InspectDirectoryResult {
  files: number;
  packs: InspectedPack[];
  functions: number;
  scripts: number;
  scriptApiUsage: ScriptApiUsageInventory;
  scriptSafeConfig: ScriptSafeConfigAnalysis;
  releaseIdentity: ReleaseIdentityAnalysis;
  structures: number;
  parsedStructures: number;
  entities: number;
  entityKnowledge: {
    analyzed: number;
    states: number;
    prerequisiteGaps: number;
    staticAnalysisLimits: number;
  };
  knowledgeRuntime: {
    enabled: boolean;
    profileResolved: boolean;
    profileSource: "target" | "education-metadata" | "unresolved";
    profileConflicts: readonly string[];
    evidenceRecords: number;
    violations: number;
    evidenceGaps: number;
    validationCases: number;
  };
  causalAnalysis: {
    chains: readonly CausalChain[];
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    projectedRisks: number;
    corroboratedRisks: number;
    observedOutcomes: number;
    incidents: readonly CausalIncident[];
    rootCauseCandidates: number;
  };
  telemetryAnalysis: {
    events: number;
    evidenceRecords: number;
    droppedEvents: number;
    byKind: Readonly<Record<string, number>>;
    continuity: {
      sequencedEvents: number;
      unsequencedEvents: number;
      unidentifiedStreamEvents: number;
      streams: number;
      missingSequences: number;
      duplicateSequences: number;
      nonMonotonicTransitions: number;
      incomplete: boolean;
    };
  };
  runtimeProbeAnalysis: {
    responses: number;
    evidenceRecords: number;
    present: number;
    absent: number;
    unknown: number;
    failed: number;
    droppedExchanges: number;
  };
  evidenceIntegrity: {
    telemetry: RuntimeEvidenceIntegrityReport;
    runtimeProbe: RuntimeEvidenceIntegrityReport;
  };
  evidenceRecovery: EvidenceRecoveryPlan;
  diagnosticProbeAnalysis: DiagnosticProbeAnalysis;
  worldDatabase: {
    present: boolean;
    fileCount: number;
    persistedPackIdentity?: PersistedPackIdentityExtraction;
    nativeScan?: {
      status: "not-present" | "scanned" | "failed";
      entriesScanned: number;
      truncated: boolean;
      actorRecords: number;
      actorDigestRecords: number;
      chunkRecords: number;
      blockEntityRecords: number;
      pendingTickRecords: number;
      randomTickRecords: number;
      finalizedStateRecords: number;
      subChunkRecords: number;
      dimensions: number[];
      chunksObserved: number;
      chunkSignals: Array<{
        chunkX: number;
        chunkZ: number;
        dimensionId: number;
        kinds: string[];
      }>;
      chunkSignalsTruncated: boolean;
      chunkContentObservations?: Array<{
        chunkX: number;
        chunkZ: number;
        dimensionId: number;
        kind: string;
        valueHash: string;
        subChunkIndex?: number;
      }>;
      chunkContentObservationsTruncated?: boolean;
      failure?: string;
    };
  };
  arenaAnalysis: {
    autoDetected: boolean;
    discovery?: ArenaReplicaDiscovery;
    spatialLayout?: ArenaSpatialLayout;
    regionPlan?: ArenaRegionPlan;
    regionClassification?: ArenaRegionClassification;
    proofPartition?: ArenaRegionPartitionResult;
    proofCoverage?: ArenaProofCoverageReport;
    proofConclusion?: ArenaProofConclusionReport;
    replicaProofQuality?: readonly ArenaReplicaProofQuality[];
    capacity?: ArenaCapacityExtractionResult;
    layoutReconciliation?: ArenaLayoutReconciliation;
    lifecycle?: ArenaLifecycleAnalysis;
    nativeSpatial?: ArenaNativeSpatialAudit;
    voxelProof?: ArenaVoxelProof;
    blockEntityProof?: ArenaBlockEntityProof;
  };
  gameplayIntent: {
    model: GameplayIntentModel;
    authoredSourceFiles: number;
    nodes: number;
    authoredNodes: number;
    inferredNodes: number;
    hypothesisNodes: number;
    invariants: number;
    unknowns: number;
  };
  gameplayIntentRuntime: {
    assessments: readonly GameplayIntentRuntimeAssessment[];
    routeAssessments: readonly GameplayIntentRouteRuntimeAssessment[];
    routeStallAssessments: readonly GameplayRouteStallRuntimeAssessment[];
    designedBehavior: number;
    probableDefects: number;
    ambiguousIntent: number;
    insufficientEvidence: number;
    runtimeStateObservations: number;
    runtimeOutcomeObservations: number;
    runtimeRouteObservations: number;
    routeResolved: number;
    routeAmbiguous: number;
    routeUnresolved: number;
    runtimeNavigationStallObservations: number;
    runtimeNavigationTargetObservations: number;
    runtimeRouteReachabilityObservations: number;
    runtimeRouteChunkAvailabilityObservations: number;
    routeEvidenceSatisfied: number;
    routeInstrumentationRequired: number;
    routeProbeRequests: number;
    routeEvidenceBlocked: number;
    stallTargetNearestMatch: number;
    stallTargetNearestDivergence: number;
    stallAmbiguous: number;
    stallUnresolved: number;
    stallRouteContextIncomplete: number;
    stallTargetAssignmentDivergence: number;
    stallRouteChunkUnavailable: number;
    stallRouteUnreachable: number;
    stallNavigationTargetDivergence: number;
    stallNavigationRuntimeSuspect: number;
    stallEvidenceIncomplete: number;
    routeSupportedCandidates: number;
    routeUnresolvedCandidates: number;
    routeCauseSupportedStops: number;
    navigationRuntimeCandidateIsolatedStops: number;
    routeEvidenceCollectionContinuingStops: number;
  };
  semanticIr: {
    executionRegions: number;
    executionEdges: number;
    unresolvedExecutionTargets: number;
    eventDispatches: number;
    deferredEdges: number;
    stateSurfaces: number;
    stateOperations: number;
    stateReads: number;
    stateWrites: number;
    stateDeletes: number;
    authorityContracts: number;
    temporalRelations: number;
    guardedDeferredRelations: number;
    unguardedDeferredRelations: number;
  };
  stateAnalysis: {
    accesses: number;
    broadWrites: number;
  };
  structureRuntime: {
    loads: number;
    resolvedLoads: number;
    unresolvedLoads: number;
    scriptLoads: number;
    resolvedScriptLoads: number;
    unresolvedScriptLoads: number;
    probabilisticLoads: number;
    runtimeLogicLoads: number;
    tickingAreas: number;
    preloadedTickingAreas: number;
    areaLoadedSchedules: number;
    embeddedCommandBlocks: number;
    unknownEmbeddedCommandEffects: number;
    queuedTickPositions: number;
    educationSpecialtyBlocks: {
      allow: number;
      deny: number;
      border: number;
    };
    absoluteLoadDestinations: Array<{
      target: string;
      chunkX: number;
      chunkZ: number;
      functionId: string;
      line?: number;
    }>;
    placedEmbeddedCommands: Array<{
      target: string;
      flatIndex: number;
      worldX: number;
      worldY: number;
      worldZ: number;
      chunkX: number;
      chunkZ: number;
      command: string;
      confidence: "inferred-transform";
    }>;
    nativeChunkCorrelations?: Array<{
      target: string;
      chunkX: number;
      chunkZ: number;
      matches: Array<{
        dimensionId: number;
        kinds: string[];
      }>;
    }>;
    embeddedCommandNativeCorrelations?: Array<{
      target: string;
      flatIndex: number;
      worldX: number;
      worldY: number;
      worldZ: number;
      chunkX: number;
      chunkZ: number;
      command: string;
      confidence: "inferred-transform";
      matches: Array<{
        dimensionId: number;
        kinds: string[];
        hasBlockEntityEvidence: boolean;
        hasPendingTickEvidence: boolean;
        hasRandomTickEvidence: boolean;
      }>;
    }>;
  };
  topologyAnalysis: {
    resolvedSpatialEffects: number;
    repeatedCandidates: number;
    linearOutliers: number;
  };
  routeAnalysis: {
    contracts: number;
    explicitContracts: number;
    derivedContracts: number;
    effectiveContracts: number;
    overlaps: number;
    dimensionUnresolved: number;
  };
  mutationTransactions: {
    assessed: number;
    verifiedBeforeDependent: number;
    dependentBeforeVerification: number;
    verificationUnresolved: number;
    noDependentAction: number;
  };
  scriptMutationTransactions: {
    assessed: number;
    verifiedBeforeDependent: number;
    dependentBeforeVerification: number;
    verificationUnresolved: number;
    noDependentAction: number;
  };
  scriptCommandTransactions: {
    assessed: number;
    verifiedBeforeDependent: number;
    dependentBeforeVerification: number;
    verificationUnresolved: number;
    noDependentAction: number;
  };
  reliability: {
    fingerprintId: string;
    fingerprint: MapCompatibilityFingerprint;
  };
  decisionBasis: DecisionBasisRevision;
  repairCandidates: InspectionRepairCandidate[];
  targetCompatibility: {
    edition: MinecraftEdition | "unknown";
    version?: string;
    educationFeatures: EducationFeatureState;
    eduLevel?: number;
  };
  diagnostics: DiagnosticFinding[];
  unresolvedReferences: number;
}


export interface InspectEvidenceInput {
  records?: readonly import("../../project-model/src/index.js").RuntimeEvidenceRecord[];
  telemetryEvents?: readonly TelemetryEvent[];
  runtimeProbeResponses?: readonly RuntimeProbeResponse[];
}
