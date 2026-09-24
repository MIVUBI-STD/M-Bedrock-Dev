import type { MinecraftEdition } from "../../compatibility/src/types.js";
import type { EducationFeatureState } from "../../compatibility/src/education.js";
import type { DiagnosticFinding } from "../../diagnostics/src/types.js";
import type { MapCompatibilityFingerprint } from "../../reliability/src/types.js";
import type { InspectionRepairCandidate } from "./repair-planning.js";
import type { ScriptApiUsageInventory } from "./script-api-usage.js";
import type { RouteCorridorContract } from "../../project-model/src/route-corridor.js";
import type { MutationDependentActionContract } from "../../project-model/src/mutation-dependent-action.js";
import type { CausalChain, CausalIncident } from "../../project-model/src/causal-chain.js";
import type { TelemetryEvent } from "../../project-model/src/telemetry.js";
import type { RuntimeProbeResponse } from "../../project-model/src/runtime-probe.js";
import type { DiagnosticProbeAnalysis } from "./diagnostic-probe-analysis.js";
import type { RuntimeEvidenceIntegrityReport } from "../../project-model/src/runtime-evidence-integrity.js";

export interface InspectTargetProfile {
  edition?: MinecraftEdition;
  version?: string;
  educationFeatures?: Exclude<EducationFeatureState, "unknown">;
  eduLevel?: number;
  experiments?: readonly string[];
  routeCorridors?: readonly RouteCorridorContract[];
  mutationDependentActions?: readonly MutationDependentActionContract[];
  staticExecutionDimension?: string;
}

export interface InspectedPack {
  root: string;
  type: string;
  uuid?: string;
  minEngineVersion?: string;
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
  diagnosticProbeAnalysis: DiagnosticProbeAnalysis;
  worldDatabase: {
    present: boolean;
    fileCount: number;
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
      failure?: string;
    };
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
  records?: readonly import("../../project-model/src/runtime-evidence.js").RuntimeEvidenceRecord[];
  telemetryEvents?: readonly TelemetryEvent[];
  runtimeProbeResponses?: readonly RuntimeProbeResponse[];
}
