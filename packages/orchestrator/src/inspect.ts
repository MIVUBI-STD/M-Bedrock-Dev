export { structureIdentifier } from "./inspect-identifiers.js";
import { discoverInspectionPacks } from "./inspect-packs.js";
import { indexInspectionSources } from "./inspect-source-index.js";
import { analyzeInspectionScriptCompatibility } from "./inspect-script-compatibility.js";
import { populateInspectionScriptImportGraph } from "./inspect-script-import-graph.js";
import { enrichInspectionSemanticGraph } from "./inspect-graph-enrichment.js";
import { prepareInspectionRuntimeEvidence } from "./inspect-runtime-evidence.js";
import { classifyContentPath } from "../../../analyzers/discovery/src/classify.js";
import {
  entityHasNavigation,
  entityHasConfiguredTargeting,
  entityRuntimeKey,
} from "../../../analyzers/entities/src/runtime-evidence.js";
import { entityKnowledgeDiagnostics } from "../../../analyzers/diagnostics/src/entity-knowledge-findings.js";
import { entityTransitionDiagnostics } from "../../../analyzers/diagnostics/src/entity-transition-findings.js";
import { analyzeEntityTransitionReachability } from "../../../analyzers/entities/src/reachability.js";
import { referenceDiagnostics } from "../../../analyzers/diagnostics/src/reference-findings.js";
import { duplicateManifestUuidDiagnostics } from "../../../analyzers/diagnostics/src/manifest-findings.js";
import { deriveEducationProfile } from "../../compatibility/src/education.js";
import { educationRequirementDiagnostic } from "../../../analyzers/diagnostics/src/education-findings.js";
import { SemanticGraph } from "../../graph/src/graph.js";
import { buildFilesystemInventory } from "../../project-model/src/filesystem-inventory.js";
import type { RuntimeEvidenceRecord } from "../../project-model/src/runtime-evidence.js";
import type { KnowledgeCatalog } from "../../knowledge/src/types.js";
import type {
  InspectDirectoryResult,
  InspectTargetProfile,
} from "./types.js";
import { analyzeFunctionTopology } from "./topology-analysis.js";
import { planInspectionRepairs } from "./repair-planning.js";
import { deriveReliabilityFingerprint } from "./reliability-fingerprint.js";
import { analyzeEntityWithKnowledge } from "./entity-knowledge-analysis.js";
import {
  analyzeKnowledgeRuntime,
  resolveInspectionKnowledgeProfile,
} from "./knowledge-runtime-analysis.js";
import { analyzeStructureAndChunkRuntime } from "./structure-runtime-analysis.js";
import { structureRuntimeEvidence } from "./structure-runtime-evidence.js";
import { derivePlacementProofs } from "./structure-proof-analysis.js";
import {
  correlateScriptStructureLoads,
  scriptStructureRuntimeEvidence,
} from "./script-structure-correlation.js";
import { areaLoadedBlockWriteEvidence } from "./area-loaded-proof.js";
import {
  analyzeMutationTransactionOrdering,
  mutationTransactionRuntimeEvidence,
} from "./mutation-transaction-analysis.js";
import {
  analyzeScriptMutationTransactions,
  scriptMutationTransactionRuntimeEvidence,
} from "./script-mutation-transaction-analysis.js";
import {
  analyzeScriptCommandMutationTransactions,
  scriptCommandMutationRuntimeEvidence,
} from "./script-command-transaction-analysis.js";
import {
  correlateRouteMutations,
  routeMutationRuntimeEvidence,
} from "./route-mutation-analysis.js";
import { topologyRuntimeEvidence } from "./topology-runtime-evidence.js";
import { synthesizeCausalChains } from "./causal-analysis.js";
import { synthesizeCausalIncidents } from "./causal-incident-analysis.js";
import { analyzeDiagnosticProbes } from "./diagnostic-probe-analysis.js";
import type { RuntimeProbeResponse } from "../../project-model/src/runtime-probe.js";
import { telemetryEventKinds } from "../../project-model/src/telemetry-validate.js";
import { buildDecisionBasis } from "./decision-basis.js";
import type { TelemetryBatch, TelemetryEvent } from "../../project-model/src/telemetry.js";
import { structureRuntimeDiagnostics } from "../../../analyzers/diagnostics/src/structure-runtime-findings.js";
import { derivePlacedEmbeddedCommands } from "./structure-placement-analysis.js";
import { deriveScriptApiUsage } from "./script-api-usage.js";
import {
  deriveEntityEventExternalEvidence,
  externalEventRootsForEntity,
} from "./entity-event-evidence.js";

export async function inspectDirectory(
  root: string,
  artifactId = "art_working",
  target: InspectTargetProfile = {},
  sourceFingerprint?: string,
  knowledgeCatalog?: KnowledgeCatalog,
  externalEvidence: readonly RuntimeEvidenceRecord[] = [],
  telemetryEvents: readonly TelemetryEvent[] = [],
  telemetryDroppedEvents = 0,
  runtimeProbeResponses: readonly RuntimeProbeResponse[] = [],
  runtimeProbeDroppedExchanges = 0,
): Promise<InspectDirectoryResult> {
  const {
    telemetryEvidence,
    runtimeProbeEvidence,
    telemetryContinuity,
    telemetryEvidenceIntegrity,
    runtimeProbeEvidenceIntegrity,
    evidenceRecovery,
    diagnostics,
  } = prepareInspectionRuntimeEvidence({
    telemetryEvents,
    telemetryDroppedEvents,
    runtimeProbeResponses,
    runtimeProbeDroppedExchanges,
  });
  const files = await buildFilesystemInventory(root);
  for (const file of files) file.kindHint = classifyContentPath(file.relativePath).kindHint;

  const { packs, manifests } = await discoverInspectionPacks(
    root,
    artifactId,
    files,
  );

  const {
    graph,
    nodes,
    parsedFunctions,
    parsedScripts,
    parsedEntities,
    parsedDialogueDocuments,
    parsedStructureModels,
    parsedStructures,
    diagnostics: sourceDiagnostics,
  } = await indexInspectionSources(
    root,
    artifactId,
    files,
  );
  diagnostics.push(...sourceDiagnostics);

  const { dialogueGraphDocuments } =
    enrichInspectionSemanticGraph({
      graph,
      nodes,
      artifactId,
      parsedFunctions,
      parsedDialogueDocuments,
      parsedStructureModels,
    });

  populateInspectionScriptImportGraph(
    graph,
    parsedScripts,
  );

  diagnostics.push(
    ...analyzeInspectionScriptCompatibility(
      manifests,
      parsedScripts,
    ),
  );

  const parsedFunctionModelsForKnowledge = parsedFunctions.map((item) => item.parsed);
  const manifestModelsForKnowledge = manifests.map((item) => item.manifest);
  const knowledgeProfileResolution = resolveInspectionKnowledgeProfile(
    target,
    manifestModelsForKnowledge,
  );
  const entityEventEvidence = deriveEntityEventExternalEvidence(
    parsedFunctions.map((item) => item.parsed),
    parsedScripts.map((item) => item.parsed),
  );

  let entityStates = 0;
  let entityKnowledgeGaps = 0;
  let entityStaticLimits = 0;
  if (knowledgeCatalog && knowledgeProfileResolution.profile) {
    for (const item of parsedEntities) {
      const profile = {
        ...knowledgeProfileResolution.profile,
        ...(item.parsed.formatVersion ? { formatVersion: item.parsed.formatVersion } : {}),
      };
      const externalRootEvents = externalEventRootsForEntity(
        item.parsed,
        entityEventEvidence,
      );
      const analysis = analyzeEntityWithKnowledge(
        item.parsed,
        knowledgeCatalog,
        profile,
        externalRootEvents,
      );
      entityStates += analysis.states;
      entityKnowledgeGaps += analysis.findings.length;
      entityStaticLimits += analysis.staticAnalysisLimits.length;
      diagnostics.push(...entityKnowledgeDiagnostics(analysis, item.node.source));
      diagnostics.push(...entityTransitionDiagnostics(
        analyzeEntityTransitionReachability(item.parsed, {
          externalRootEvents,
        }),
        item.node.source,
      ));
    }
  }

  diagnostics.push(
    ...duplicateManifestUuidDiagnostics(manifests.map((entry) => entry.manifest)),
    ...referenceDiagnostics([
      ...graph.unresolvedEdges().filter((edge) => edge.type !== "IMPORTS_MINECRAFT_MODULE"),
      ...graph.ambiguousEdges(),
    ]),
  );

  const parsedFunctionModels = parsedFunctions.map((item) => item.parsed);
  const parsedStructureSummaries = parsedStructureModels.map((item) => ({
    identifier: item.identifier,
    relativePath: item.node.source.relativePath,
    ...(item.size ? { size: item.size } : {}),
    semantics: item.semantics,
  }));
  const structureRuntime = analyzeStructureAndChunkRuntime(
    parsedFunctionModels,
    parsedStructureSummaries,
  );
  const scriptStructureLoads = correlateScriptStructureLoads(
    parsedScripts.map((item) => item.parsed),
    parsedStructureSummaries,
  );
  const sourceByFunction = new Map(
    parsedFunctions.map((item) => [item.parsed.identifier, item.node.source]),
  );
  diagnostics.push(...structureRuntimeDiagnostics(structureRuntime, sourceByFunction));

  const placedEmbeddedCommands = structureRuntime.correlations.flatMap((correlation) => {
    if (correlation.status !== "resolved") return [];
    const parsed = parsedStructureModels.find(
      (item) => item.identifier === correlation.load.semantics.name,
    );
    if (!parsed) return [];
    return derivePlacedEmbeddedCommands(
      {
        ...(correlation.load.semantics.position
          ? { position: correlation.load.semantics.position }
          : {}),
        ...(correlation.load.semantics.rotation
          ? { rotation: correlation.load.semantics.rotation }
          : {}),
        ...(correlation.load.semantics.mirror
          ? { mirror: correlation.load.semantics.mirror }
          : {}),
      },
      parsed.size,
      parsed.embeddedCommands.map((item) => item.block),
    ).map((item) => ({
      target: correlation.load.semantics.name,
      flatIndex: item.flatIndex,
      worldX: item.world.x,
      worldY: item.world.y,
      worldZ: item.world.z,
      chunkX: Math.floor(item.world.x / 16),
      chunkZ: Math.floor(item.world.z / 16),
      command: item.command,
      confidence: item.confidence,
    }));
  });

  const topology = analyzeFunctionTopology(parsedFunctionModels);
  diagnostics.push(...topology.stateDiagnostics, ...topology.topologyDiagnostics);

  const structureProofs = derivePlacementProofs(
    structureRuntime,
    parsedFunctionModels,
  );
  const routeCorrelations = correlateRouteMutations(
    target.routeCorridors ?? [],
    topology,
    structureProofs,
    target.staticExecutionDimension,
  );
  const navigatingEntities = new Map(
    parsedEntities
      .map((item) => item.parsed)
      .filter(entityHasNavigation)
      .map((entity) => [
        entityRuntimeKey(entity),
        [entity.source] as const,
      ]),
  );
  const targetDrivenEntities = new Map(
    parsedEntities
      .map((item) => item.parsed)
      .filter(entityHasConfiguredTargeting)
      .map((entity) => [
        entityRuntimeKey(entity),
        [entity.source] as const,
      ]),
  );
  const mutationTransactions = analyzeMutationTransactionOrdering(
    parsedFunctionModels,
    structureProofs,
    target.mutationDependentActions ?? [],
  );
  const scriptMutationTransactions = analyzeScriptMutationTransactions(
    parsedScripts.map((item) => item.parsed),
    target.mutationDependentActions ?? [],
  );
  const scriptCommandTransactions =
    analyzeScriptCommandMutationTransactions(
      parsedScripts.map((item) => item.parsed),
      parsedStructureSummaries,
      target.mutationDependentActions ?? [],
    );

  const knowledgeRuntime = analyzeKnowledgeRuntime(
    knowledgeCatalog,
    target,
    manifestModelsForKnowledge,
    parsedFunctionModelsForKnowledge,
    [
      ...structureRuntimeEvidence(
        structureRuntime,
        sourceByFunction,
        structureProofs,
      ),
      ...topologyRuntimeEvidence(topology),
      ...areaLoadedBlockWriteEvidence(
        structureRuntime,
        parsedFunctionModels,
      ),
      ...routeMutationRuntimeEvidence(
        routeCorrelations,
        navigatingEntities,
        targetDrivenEntities,
      ),
      ...mutationTransactionRuntimeEvidence(
        mutationTransactions.assessments,
      ),
      ...scriptMutationTransactionRuntimeEvidence(
        scriptMutationTransactions,
      ),
      ...scriptStructureRuntimeEvidence(scriptStructureLoads),
      ...scriptCommandMutationRuntimeEvidence(
        scriptCommandTransactions,
      ),
      ...externalEvidence,
      ...telemetryEvidence,
      ...runtimeProbeEvidence.records,
    ],
    parsedScripts.map((item) => item.parsed),
    parsedEntities.map((item) => ({
      entity: item.parsed,
      externalRootEvents: externalEventRootsForEntity(
        item.parsed,
        entityEventEvidence,
      ),
    })),
  );
  diagnostics.push(...knowledgeRuntime.diagnostics);

  const educationMetadata = manifests.some(
    ({ manifest }) => manifest.hasEducationMetadata === true,
  );
  const targetEducation = deriveEducationProfile({
    edition: target.edition ?? "unknown",
    manifestEducationMetadata: educationMetadata,
    ...(target.educationFeatures !== undefined
      ? { worldEducationFeatures: target.educationFeatures === "enabled" }
      : {}),
    ...(target.eduLevel !== undefined ? { eduLevel: target.eduLevel } : {}),
  });

  const educationSpecialtyBlocks = {
    allow: parsedStructureModels.reduce(
      (sum, item) => sum + item.semantics.educationAllowEntries,
      0,
    ),
    deny: parsedStructureModels.reduce(
      (sum, item) => sum + item.semantics.educationDenyEntries,
      0,
    ),
    border: parsedStructureModels.reduce(
      (sum, item) => sum + item.semantics.educationBorderEntries,
      0,
    ),
  };
  const educationSpecialtyCount =
    educationSpecialtyBlocks.allow +
    educationSpecialtyBlocks.deny +
    educationSpecialtyBlocks.border;

  if (educationSpecialtyCount > 0) {
    const finding = educationRequirementDiagnostic(targetEducation);
    if (finding) {
      diagnostics.push({
        ...finding,
        data: {
          ...(finding.data ?? {}),
          educationSpecialtyBlocks,
        },
      });
    }
  }

  const dbFiles = files.filter((file) => {
    const normalized = "/" + file.relativePath.replaceAll("\\", "/");
    return normalized.includes("/db/");
  });

  const scriptApiUsage = deriveScriptApiUsage(
    parsedScripts.map((item) => item.parsed),
  );

  const decisionBasis = buildDecisionBasis({
    ...(sourceFingerprint === undefined
      ? {}
      : { sourceFingerprint }),
    graph,
    ...(knowledgeCatalog === undefined
      ? {}
      : { knowledge: knowledgeCatalog }),
    target,
    runtimeEvidence: [
      ...externalEvidence,
      ...telemetryEvidence,
      ...runtimeProbeEvidence.records,
    ],
    evidenceIntegrity: {
      telemetry: telemetryEvidenceIntegrity,
      runtimeProbe: runtimeProbeEvidenceIntegrity,
    },
  });

  const causalChains = synthesizeCausalChains(diagnostics, {
    telemetryTemporalReliable:
      !telemetryContinuity.incomplete,
    runtimeProbeTemporalReliable:
      runtimeProbeDroppedExchanges === 0,
  });
  const causalIncidents = synthesizeCausalIncidents(causalChains);
  const diagnosticProbeAnalysis = analyzeDiagnosticProbes(
    causalIncidents,
    diagnostics,
    knowledgeRuntime.validationCases,
    "LOCAL_ARTIFACT",
  );

  const reliability = deriveReliabilityFingerprint({
    mapId: artifactId,
    ...(sourceFingerprint ? { artifactFingerprint: sourceFingerprint } : {}),
    packs,
    functions: parsedFunctions.map((item) => item.parsed),
    scripts: parsedScripts.map((item) => item.parsed),
    structures: nodes.filter((node) => node.kind === "structure").length,
    parsedStructures,
    entities: parsedEntities.length,
    entityKnowledgeGaps,
    worldDatabasePresent: dbFiles.length > 0,
    stateAccesses: topology.stateAccesses.length,
    broadStateWrites: topology.broadWrites,
    repeatedTopologyCandidates: topology.candidates.length,
    diagnostics,
    causalChains,
    causalIncidents,
    target,
  });

  return {
    files: files.length,
    packs,
    functions: nodes.filter((node) => node.kind === "function").length,
    scripts: nodes.filter((node) => node.kind === "script_file").length,
    scriptApiUsage,
    structures: nodes.filter((node) => node.kind === "structure").length,
    parsedStructures,
    entities: parsedEntities.length,
    entityKnowledge: {
      analyzed: knowledgeCatalog && knowledgeProfileResolution.profile
        ? parsedEntities.length
        : 0,
      states: entityStates,
      prerequisiteGaps: entityKnowledgeGaps,
      staticAnalysisLimits: entityStaticLimits,
    },
    knowledgeRuntime: {
      enabled: knowledgeRuntime.enabled,
      profileResolved: knowledgeRuntime.profileResolved,
      profileSource: knowledgeRuntime.profileSource,
      profileConflicts: knowledgeRuntime.profileConflicts,
      evidenceRecords: knowledgeRuntime.evidenceRecords,
      violations: knowledgeRuntime.violations,
      evidenceGaps: knowledgeRuntime.evidenceGaps,
      validationCases: knowledgeRuntime.validationCases.length,
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
          item.nodes.filter((node) => node.kind === "downstream-risk").length,
        0,
      ),
      corroboratedRisks: causalChains.reduce(
        (sum, item) =>
          sum +
          item.links.filter(
            (link) => link.strength === "corroborated-risk",
          ).length,
        0,
      ),
      observedOutcomes: causalChains.reduce((sum, item) => {
        const nodesById = new Map(item.nodes.map((node) => [node.id, node]));
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
      }, 0),
      incidents: causalIncidents,
      rootCauseCandidates: causalIncidents.reduce(
        (sum, incident) => sum + incident.rootCauseCandidates.length,
        0,
      ),
    },
    telemetryAnalysis: {
      events: telemetryEvents.length,
      evidenceRecords: telemetryEvidence.length,
      droppedEvents: telemetryDroppedEvents,
      byKind: telemetryEventKinds(telemetryEvents),
      continuity: {
        sequencedEvents: telemetryContinuity.sequencedEvents,
        unsequencedEvents: telemetryContinuity.unsequencedEvents,
        unidentifiedStreamEvents:
          telemetryContinuity.unidentifiedStreamEvents,
        streams: telemetryContinuity.streams.length,
        missingSequences: telemetryContinuity.missingSequences,
        duplicateSequences: telemetryContinuity.duplicateSequences,
        nonMonotonicTransitions:
          telemetryContinuity.nonMonotonicTransitions,
        incomplete: telemetryContinuity.incomplete,
      },
    },
    runtimeProbeAnalysis: {
      responses: runtimeProbeEvidence.summary.responses,
      evidenceRecords: runtimeProbeEvidence.records.length,
      present: runtimeProbeEvidence.summary.present,
      absent: runtimeProbeEvidence.summary.absent,
      unknown: runtimeProbeEvidence.summary.unknown,
      failed: runtimeProbeEvidence.summary.failed,
      droppedExchanges: runtimeProbeDroppedExchanges,
    },
    evidenceIntegrity: {
      telemetry: telemetryEvidenceIntegrity,
      runtimeProbe: runtimeProbeEvidenceIntegrity,
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
      resolvedLoads: structureRuntime.correlations.filter((item) => item.status === "resolved").length,
      unresolvedLoads: structureRuntime.unresolvedStructureLoads,
      scriptLoads: scriptStructureLoads.length,
      resolvedScriptLoads: scriptStructureLoads.filter(
        (item) => item.status === "resolved",
      ).length,
      unresolvedScriptLoads: scriptStructureLoads.filter(
        (item) => item.status !== "resolved",
      ).length,
      probabilisticLoads: structureRuntime.probabilisticStructureLoads,
      runtimeLogicLoads: structureRuntime.runtimeLogicStructureLoads,
      tickingAreas: structureRuntime.chunkLifecycleEvidence.tickingAreas,
      preloadedTickingAreas: structureRuntime.chunkLifecycleEvidence.preloadedTickingAreas,
      areaLoadedSchedules: structureRuntime.chunkLifecycleEvidence.areaLoadedSchedules,
      embeddedCommandBlocks: parsedStructureModels.reduce(
        (sum, item) => sum + item.embeddedCommands.length,
        0,
      ),
      unknownEmbeddedCommandEffects: parsedStructureModels.reduce(
        (sum, item) => sum + item.embeddedCommands.reduce(
          (inner, command) => inner + command.unknownEffects,
          0,
        ),
        0,
      ),
      queuedTickPositions: parsedStructureModels.reduce(
        (sum, item) => sum + item.queuedTickPositions,
        0,
      ),
      educationSpecialtyBlocks,
      absoluteLoadDestinations: structureRuntime.absoluteLoadDestinations,
      placedEmbeddedCommands,
    },
    topologyAnalysis: {
      resolvedSpatialEffects: topology.resolvedSpatialEffects.length,
      repeatedCandidates: topology.candidates.length,
      linearOutliers: topology.linearOutliers.length,
    },
    routeAnalysis: {
      contracts: target.routeCorridors?.length ?? 0,
      overlaps: routeCorrelations.filter((item) => item.status === "overlap").length,
      dimensionUnresolved: routeCorrelations.filter(
        (item) => item.status === "dimension-unresolved",
      ).length,
    },
    mutationTransactions: {
      assessed: mutationTransactions.assessments.length,
      verifiedBeforeDependent: mutationTransactions.assessments.filter(
        (item) => item.status === "verified-before-dependent",
      ).length,
      dependentBeforeVerification: mutationTransactions.assessments.filter(
        (item) => item.status === "dependent-before-verification",
      ).length,
      verificationUnresolved: mutationTransactions.assessments.filter(
        (item) => item.status === "verification-unresolved",
      ).length,
      noDependentAction: mutationTransactions.assessments.filter(
        (item) => item.status === "no-dependent-action",
      ).length,
    },
    scriptMutationTransactions: {
      assessed: scriptMutationTransactions.length,
      verifiedBeforeDependent: scriptMutationTransactions.filter(
        (item) => item.status === "verified-before-dependent",
      ).length,
      dependentBeforeVerification: scriptMutationTransactions.filter(
        (item) => item.status === "dependent-before-verification",
      ).length,
      verificationUnresolved: scriptMutationTransactions.filter(
        (item) => item.status === "verification-unresolved",
      ).length,
      noDependentAction: scriptMutationTransactions.filter(
        (item) => item.status === "no-dependent-action",
      ).length,
    },
    scriptCommandTransactions: {
      assessed: scriptCommandTransactions.length,
      verifiedBeforeDependent: scriptCommandTransactions.filter(
        (item) => item.status === "verified-before-dependent",
      ).length,
      dependentBeforeVerification: scriptCommandTransactions.filter(
        (item) => item.status === "dependent-before-verification",
      ).length,
      verificationUnresolved: scriptCommandTransactions.filter(
        (item) => item.status === "verification-unresolved",
      ).length,
      noDependentAction: scriptCommandTransactions.filter(
        (item) => item.status === "no-dependent-action",
      ).length,
    },
    reliability: {
      fingerprintId: reliability.id,
      fingerprint: reliability.fingerprint,
    },
    decisionBasis,
    repairCandidates: planInspectionRepairs(topology, sourceFingerprint),
    targetCompatibility: {
      edition: target.edition ?? "unknown",
      ...(target.version !== undefined ? { version: target.version } : {}),
      educationFeatures: target.edition === undefined && target.educationFeatures === undefined
        ? "unknown"
        : targetEducation.educationFeatures,
      ...(targetEducation.eduLevel !== undefined ? { eduLevel: targetEducation.eduLevel } : {}),
    },
    diagnostics,
    unresolvedReferences: graph.unresolvedEdges()
      .filter((edge) => edge.type !== "IMPORTS_MINECRAFT_MODULE").length,
  };
}
