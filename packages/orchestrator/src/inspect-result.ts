import type { DiagnosticFinding } from "../../diagnostics/src/index.js";
import type { FileInventoryEntry } from "../../project-model/src/project.js";
import type { TelemetryEvent } from "../../project-model/src/telemetry.js";
import { telemetryEventKinds } from "../../project-model/src/telemetry-validate.js";
import type {
  InspectDirectoryResult,
  InspectedPack,
  InspectTargetProfile,
} from "./types.js";
import { planInspectionRepairs } from "./repair-planning.js";
import { deriveReliabilityFingerprint } from "./reliability-fingerprint.js";
import { deriveScriptApiUsage } from "./script-api-usage.js";
import { indexInspectionSources } from "./inspect-source-index.js";
import { prepareInspectionRuntimeEvidence } from "./inspect-runtime-evidence.js";
import { analyzeInspectionEntityKnowledge } from "./inspect-entity-knowledge-stage.js";
import { analyzeKnowledgeRuntime } from "./knowledge-runtime-analysis.js";
import { analyzeInspectionRuntimeState } from "./inspect-runtime-analysis-stage.js";
import { analyzeInspectionEducation } from "./inspect-education-stage.js";
import { analyzeInspectionCausality } from "./inspect-causality-stage.js";

type SourceIndex = Awaited<
  ReturnType<typeof indexInspectionSources>
>;
type RuntimeEvidenceStage = ReturnType<
  typeof prepareInspectionRuntimeEvidence
>;
type EntityKnowledgeStage = ReturnType<
  typeof analyzeInspectionEntityKnowledge
>;
type KnowledgeRuntimeStage = ReturnType<
  typeof analyzeKnowledgeRuntime
>;
type RuntimeAnalysisStage = ReturnType<
  typeof analyzeInspectionRuntimeState
>;
type EducationStage = ReturnType<
  typeof analyzeInspectionEducation
>;
type CausalityStage = ReturnType<
  typeof analyzeInspectionCausality
>;

export interface InspectionResultInput {
  artifactId: string;
  sourceFingerprint?: string;
  files: readonly FileInventoryEntry[];
  packs: readonly InspectedPack[];
  target: InspectTargetProfile;
  knowledgeCatalogPresent: boolean;
  sourceIndex: SourceIndex;
  runtimeEvidenceStage: RuntimeEvidenceStage;
  entityKnowledge: EntityKnowledgeStage;
  knowledgeRuntime: KnowledgeRuntimeStage;
  runtimeAnalysis: RuntimeAnalysisStage;
  education: EducationStage;
  causal: CausalityStage;
  telemetryEvents: readonly TelemetryEvent[];
  telemetryDroppedEvents: number;
  runtimeProbeDroppedExchanges: number;
  diagnostics: readonly DiagnosticFinding[];
}

function countObservedOutcomes(
  causalChains: CausalityStage["causalChains"],
): number {
  return causalChains.reduce((sum, item) => {
    const nodesById = new Map(
      item.nodes.map((node) => [node.id, node]),
    );
    return sum + new Set(
      item.links
        .filter((link) => {
          const from = nodesById.get(link.from);
          const to = nodesById.get(link.to);
          return (
            link.strength === "direct-evidence" &&
            link.temporalIntegrity !== "incomplete" &&
            link.temporalStatus !== "before-subject" &&
            from?.kind === "downstream-risk" &&
            to?.kind === "observed-state"
          );
        })
        .map((link) => link.to),
    ).size;
  }, 0);
}

function transactionSummary(
  items: readonly {
    status:
      | "verified-before-dependent"
      | "dependent-before-verification"
      | "verification-unresolved"
      | "no-dependent-action";
  }[],
) {
  return {
    assessed: items.length,
    verifiedBeforeDependent: items.filter(
      (item) =>
        item.status === "verified-before-dependent",
    ).length,
    dependentBeforeVerification: items.filter(
      (item) =>
        item.status === "dependent-before-verification",
    ).length,
    verificationUnresolved: items.filter(
      (item) =>
        item.status === "verification-unresolved",
    ).length,
    noDependentAction: items.filter(
      (item) =>
        item.status === "no-dependent-action",
    ).length,
  };
}

export function buildInspectionResult(
  input: InspectionResultInput,
): InspectDirectoryResult {
  const {
    graph,
    nodes,
    parsedFunctions,
    parsedScripts,
    parsedEntities,
    parsedStructureModels,
    parsedStructures,
  } = input.sourceIndex;

  const {
    telemetryEvidence,
    runtimeProbeEvidence,
    telemetryContinuity,
    telemetryEvidenceIntegrity,
    runtimeProbeEvidenceIntegrity,
    evidenceRecovery,
  } = input.runtimeEvidenceStage;

  const {
    knowledgeProfileResolution,
    entityStates,
    entityKnowledgeGaps,
    entityStaticLimits,
  } = input.entityKnowledge;

  const {
    structureRuntime,
    scriptStructureLoads,
    placedEmbeddedCommands,
    topology,
    routeCorrelations,
    mutationTransactions,
    scriptMutationTransactions,
    scriptCommandTransactions,
  } = input.runtimeAnalysis;

  const {
    targetEducation,
    educationSpecialtyBlocks,
  } = input.education;

  const {
    decisionBasis,
    causalChains,
    causalIncidents,
    diagnosticProbeAnalysis,
  } = input.causal;

  const dbFiles = input.files.filter((file) => {
    const normalized =
      "/" + file.relativePath.replaceAll("\\", "/");
    return normalized.includes("/db/");
  });

  const scriptApiUsage = deriveScriptApiUsage(
    parsedScripts.map((item) => item.parsed),
  );

  const reliability = deriveReliabilityFingerprint({
    mapId: input.artifactId,
    ...(input.sourceFingerprint
      ? {
          artifactFingerprint:
            input.sourceFingerprint,
        }
      : {}),
    packs: [...input.packs],
    functions: parsedFunctions.map(
      (item) => item.parsed,
    ),
    scripts: parsedScripts.map(
      (item) => item.parsed,
    ),
    structures: nodes.filter(
      (node) => node.kind === "structure",
    ).length,
    parsedStructures,
    entities: parsedEntities.length,
    entityKnowledgeGaps,
    worldDatabasePresent: dbFiles.length > 0,
    stateAccesses: topology.stateAccesses.length,
    broadStateWrites: topology.broadWrites,
    repeatedTopologyCandidates:
      topology.candidates.length,
    diagnostics: input.diagnostics,
    causalChains,
    causalIncidents,
    target: input.target,
  });

  return {
    files: input.files.length,
    packs: [...input.packs],
    functions: nodes.filter(
      (node) => node.kind === "function",
    ).length,
    scripts: nodes.filter(
      (node) => node.kind === "script_file",
    ).length,
    scriptApiUsage,
    structures: nodes.filter(
      (node) => node.kind === "structure",
    ).length,
    parsedStructures,
    entities: parsedEntities.length,
    entityKnowledge: {
      analyzed:
        input.knowledgeCatalogPresent &&
        knowledgeProfileResolution.profile
          ? parsedEntities.length
          : 0,
      states: entityStates,
      prerequisiteGaps: entityKnowledgeGaps,
      staticAnalysisLimits: entityStaticLimits,
    },
    knowledgeRuntime: {
      enabled: input.knowledgeRuntime.enabled,
      profileResolved:
        input.knowledgeRuntime.profileResolved,
      profileSource:
        input.knowledgeRuntime.profileSource,
      profileConflicts:
        input.knowledgeRuntime.profileConflicts,
      evidenceRecords:
        input.knowledgeRuntime.evidenceRecords,
      violations:
        input.knowledgeRuntime.violations,
      evidenceGaps:
        input.knowledgeRuntime.evidenceGaps,
      validationCases:
        input.knowledgeRuntime.validationCases.length,
    },
    causalAnalysis: {
      chains: causalChains,
      highConfidence: causalChains.filter(
        (item) => item.confidence === "high",
      ).length,
      mediumConfidence: causalChains.filter(
        (item) => item.confidence === "medium",
      ).length,
      lowConfidence: causalChains.filter(
        (item) => item.confidence === "low",
      ).length,
      projectedRisks: causalChains.reduce(
        (sum, item) =>
          sum +
          item.nodes.filter(
            (node) =>
              node.kind === "downstream-risk",
          ).length,
        0,
      ),
      corroboratedRisks: causalChains.reduce(
        (sum, item) =>
          sum +
          item.links.filter(
            (link) =>
              link.strength ===
              "corroborated-risk",
          ).length,
        0,
      ),
      observedOutcomes:
        countObservedOutcomes(causalChains),
      incidents: causalIncidents,
      rootCauseCandidates:
        causalIncidents.reduce(
          (sum, incident) =>
            sum +
            incident.rootCauseCandidates.length,
          0,
        ),
    },
    telemetryAnalysis: {
      events: input.telemetryEvents.length,
      evidenceRecords: telemetryEvidence.length,
      droppedEvents:
        input.telemetryDroppedEvents,
      byKind:
        telemetryEventKinds(input.telemetryEvents),
      continuity: {
        sequencedEvents:
          telemetryContinuity.sequencedEvents,
        unsequencedEvents:
          telemetryContinuity.unsequencedEvents,
        unidentifiedStreamEvents:
          telemetryContinuity
            .unidentifiedStreamEvents,
        streams:
          telemetryContinuity.streams.length,
        missingSequences:
          telemetryContinuity.missingSequences,
        duplicateSequences:
          telemetryContinuity.duplicateSequences,
        nonMonotonicTransitions:
          telemetryContinuity
            .nonMonotonicTransitions,
        incomplete:
          telemetryContinuity.incomplete,
      },
    },
    runtimeProbeAnalysis: {
      responses:
        runtimeProbeEvidence.summary.responses,
      evidenceRecords:
        runtimeProbeEvidence.records.length,
      present:
        runtimeProbeEvidence.summary.present,
      absent:
        runtimeProbeEvidence.summary.absent,
      unknown:
        runtimeProbeEvidence.summary.unknown,
      failed:
        runtimeProbeEvidence.summary.failed,
      droppedExchanges:
        input.runtimeProbeDroppedExchanges,
    },
    evidenceIntegrity: {
      telemetry: telemetryEvidenceIntegrity,
      runtimeProbe:
        runtimeProbeEvidenceIntegrity,
    },
    evidenceRecovery,
    diagnosticProbeAnalysis,
    worldDatabase: {
      present: dbFiles.length > 0,
      fileCount: dbFiles.length,
    },
    stateAnalysis: {
      accesses: topology.stateAccesses.length,
      broadWrites: topology.broadWrites,
    },
    structureRuntime: {
      loads: structureRuntime.structureLoads.length,
      resolvedLoads:
        structureRuntime.correlations.filter(
          (item) => item.status === "resolved",
        ).length,
      unresolvedLoads:
        structureRuntime.unresolvedStructureLoads,
      scriptLoads: scriptStructureLoads.length,
      resolvedScriptLoads:
        scriptStructureLoads.filter(
          (item) => item.status === "resolved",
        ).length,
      unresolvedScriptLoads:
        scriptStructureLoads.filter(
          (item) => item.status !== "resolved",
        ).length,
      probabilisticLoads:
        structureRuntime
          .probabilisticStructureLoads,
      runtimeLogicLoads:
        structureRuntime.runtimeLogicStructureLoads,
      tickingAreas:
        structureRuntime.chunkLifecycleEvidence
          .tickingAreas,
      preloadedTickingAreas:
        structureRuntime.chunkLifecycleEvidence
          .preloadedTickingAreas,
      areaLoadedSchedules:
        structureRuntime.chunkLifecycleEvidence
          .areaLoadedSchedules,
      embeddedCommandBlocks:
        parsedStructureModels.reduce(
          (sum, item) =>
            sum + item.embeddedCommands.length,
          0,
        ),
      unknownEmbeddedCommandEffects:
        parsedStructureModels.reduce(
          (sum, item) =>
            sum +
            item.embeddedCommands.reduce(
              (inner, command) =>
                inner + command.unknownEffects,
              0,
            ),
          0,
        ),
      queuedTickPositions:
        parsedStructureModels.reduce(
          (sum, item) =>
            sum + item.queuedTickPositions,
          0,
        ),
      educationSpecialtyBlocks,
      absoluteLoadDestinations:
        structureRuntime.absoluteLoadDestinations,
      placedEmbeddedCommands,
    },
    topologyAnalysis: {
      resolvedSpatialEffects:
        topology.resolvedSpatialEffects.length,
      repeatedCandidates:
        topology.candidates.length,
      linearOutliers:
        topology.linearOutliers.length,
    },
    routeAnalysis: {
      contracts:
        input.target.routeCorridors?.length ?? 0,
      overlaps: routeCorrelations.filter(
        (item) => item.status === "overlap",
      ).length,
      dimensionUnresolved:
        routeCorrelations.filter(
          (item) =>
            item.status ===
            "dimension-unresolved",
        ).length,
    },
    mutationTransactions:
      transactionSummary(
        mutationTransactions.assessments,
      ),
    scriptMutationTransactions:
      transactionSummary(
        scriptMutationTransactions,
      ),
    scriptCommandTransactions:
      transactionSummary(
        scriptCommandTransactions,
      ),
    reliability: {
      fingerprintId: reliability.id,
      fingerprint: reliability.fingerprint,
    },
    decisionBasis,
    repairCandidates: planInspectionRepairs(
      topology,
      input.sourceFingerprint,
    ),
    targetCompatibility: {
      edition:
        input.target.edition ?? "unknown",
      ...(input.target.version !== undefined
        ? { version: input.target.version }
        : {}),
      educationFeatures:
        input.target.edition === undefined &&
        input.target.educationFeatures === undefined
          ? "unknown"
          : targetEducation.educationFeatures,
      ...(targetEducation.eduLevel !== undefined
        ? { eduLevel: targetEducation.eduLevel }
        : {}),
    },
    diagnostics: [...input.diagnostics],
    unresolvedReferences:
      graph.unresolvedEdges()
        .filter(
          (edge) =>
            edge.type !==
            "IMPORTS_MINECRAFT_MODULE",
        ).length,
  };
}
