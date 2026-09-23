import type { MinecraftEdition } from "../../compatibility/src/types.js";
import type { EducationFeatureState } from "../../compatibility/src/education.js";
import type { DiagnosticFinding } from "../../diagnostics/src/types.js";
import type { MapCompatibilityFingerprint } from "../../reliability/src/types.js";
import type { InspectionRepairCandidate } from "./repair-planning.js";

export interface InspectTargetProfile {
  edition?: MinecraftEdition;
  educationFeatures?: Exclude<EducationFeatureState, "unknown">;
  eduLevel?: number;
  experiments?: readonly string[];
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
  structures: number;
  parsedStructures: number;
  entities: number;
  entityKnowledge: {
    analyzed: number;
    states: number;
    prerequisiteGaps: number;
    staticAnalysisLimits: number;
  };
  worldDatabase: {
    present: boolean;
    fileCount: number;
  };
  stateAnalysis: {
    accesses: number;
    broadWrites: number;
  };
  structureRuntime: {
    loads: number;
    resolvedLoads: number;
    unresolvedLoads: number;
    probabilisticLoads: number;
    runtimeLogicLoads: number;
    tickingAreas: number;
    preloadedTickingAreas: number;
    areaLoadedSchedules: number;
  };
  topologyAnalysis: {
    resolvedSpatialEffects: number;
    repeatedCandidates: number;
    linearOutliers: number;
  };
  reliability: {
    fingerprintId: string;
    fingerprint: MapCompatibilityFingerprint;
  };
  repairCandidates: InspectionRepairCandidate[];
  targetCompatibility: {
    edition: MinecraftEdition | "unknown";
    educationFeatures: EducationFeatureState;
    eduLevel?: number;
  };
  diagnostics: DiagnosticFinding[];
  unresolvedReferences: number;
}
