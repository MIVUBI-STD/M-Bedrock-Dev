export { structureIdentifier } from "./inspect-identifiers.js";
import { discoverInspectionPacks } from "./inspect-packs.js";
import { indexInspectionSources } from "./inspect-source-index.js";
import { analyzeInspectionScriptCompatibility } from "./inspect-script-compatibility.js";
import { populateInspectionScriptImportGraph } from "./inspect-script-import-graph.js";
import { enrichInspectionSemanticGraph } from "./inspect-graph-enrichment.js";
import { analyzeInspectionEntityKnowledge } from "./inspect-entity-knowledge-stage.js";
import { analyzeInspectionRuntimeState } from "./inspect-runtime-analysis-stage.js";
import { analyzeInspectionEducation } from "./inspect-education-stage.js";
import { analyzeInspectionCausality } from "./inspect-causality-stage.js";
import { buildInspectionResult } from "./inspect-result.js";
import { prepareInspectionRuntimeEvidence } from "./inspect-runtime-evidence.js";
import { classifyContentPath } from "../../../analyzers/discovery/src/index.js";
import { referenceDiagnostics } from "../../../analyzers/diagnostics/src/index.js";
import { duplicateManifestUuidDiagnostics } from "../../../analyzers/diagnostics/src/index.js";
import { buildFilesystemInventory } from "../../project-model/src/index.js";
import type { RuntimeEvidenceRecord } from "../../project-model/src/index.js";
import type { KnowledgeCatalog } from "../../knowledge/src/index.js";
import type {
  InspectDirectoryResult,
  InspectTargetProfile,
} from "./types.js";
import { analyzeKnowledgeRuntime } from "./knowledge-runtime-analysis.js";
import { structureRuntimeEvidence } from "./structure-runtime-evidence.js";
import { scriptStructureRuntimeEvidence } from "./script-structure-correlation.js";
import { areaLoadedBlockWriteEvidence } from "./area-loaded-proof.js";
import { mutationTransactionRuntimeEvidence } from "./mutation-transaction-analysis.js";
import { scriptMutationTransactionRuntimeEvidence } from "./script-mutation-transaction-analysis.js";
import { scriptCommandMutationRuntimeEvidence } from "./script-command-transaction-analysis.js";
import { routeMutationRuntimeEvidence } from "./route-mutation-analysis.js";
import { topologyRuntimeEvidence } from "./topology-runtime-evidence.js";
import type { RuntimeProbeResponse } from "../../project-model/src/index.js";
import type { TelemetryBatch, TelemetryEvent } from "../../project-model/src/index.js";
import { externalEventRootsForEntity } from "./entity-event-evidence.js";
import { buildInspectionSemanticIr } from "./semantic-ir-stage.js";
import { semanticIrDiagnostics } from "./semantic-ir-diagnostics.js";
import { buildGameplayIntentModel } from "./gameplay-intent-stage.js";

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
  const runtimeEvidenceStage =
    prepareInspectionRuntimeEvidence({
      telemetryEvents,
      telemetryDroppedEvents,
      runtimeProbeResponses,
      runtimeProbeDroppedExchanges,
    });
  const {
    telemetryEvidence,
    runtimeProbeEvidence,
    telemetryContinuity,
    telemetryEvidenceIntegrity,
    runtimeProbeEvidenceIntegrity,
    diagnostics,
  } = runtimeEvidenceStage;
  const files = await buildFilesystemInventory(root);
  for (const file of files) file.kindHint = classifyContentPath(file.relativePath).kindHint;

  const { packs, manifests } = await discoverInspectionPacks(
    root,
    artifactId,
    files,
  );

  const sourceIndex = await indexInspectionSources(
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
    diagnostics: sourceDiagnostics,
  } = sourceIndex;
  diagnostics.push(...sourceDiagnostics);

  const semanticIr = buildInspectionSemanticIr({
    parsedFunctions,
    parsedScripts,
    stateAuthorityContracts:
      target.stateAuthorityContracts ?? [],
  });

  diagnostics.push(
    ...semanticIrDiagnostics(semanticIr),
  );

  const gameplayIntent = buildGameplayIntentModel({
    id: "gameplay-intent:" + artifactId,
    artifactId,
    parsedScripts,
  });

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

  const manifestModelsForKnowledge =
    manifests.map((item) => item.manifest);
  const parsedFunctionModelsForKnowledge =
    parsedFunctions.map((item) => item.parsed);

  const entityKnowledge = analyzeInspectionEntityKnowledge({
    target,
    ...(knowledgeCatalog === undefined
      ? {}
      : { knowledgeCatalog }),
    manifests: manifestModelsForKnowledge,
    parsedFunctions,
    parsedScripts,
    parsedEntities,
  });
  const { entityEventEvidence } =
    entityKnowledge;
  diagnostics.push(...entityKnowledge.diagnostics);

  diagnostics.push(
    ...duplicateManifestUuidDiagnostics(manifests.map((entry) => entry.manifest)),
    ...referenceDiagnostics([
      ...graph.unresolvedEdges().filter((edge) => edge.type !== "IMPORTS_MINECRAFT_MODULE"),
      ...graph.ambiguousEdges(),
    ]),
  );

  const runtimeAnalysis =
    analyzeInspectionRuntimeState({
      target,
      parsedFunctions,
      parsedScripts,
      parsedEntities,
      parsedStructureModels,
    });
  const {
    parsedFunctionModels,
    structureRuntime,
    scriptStructureLoads,
    sourceByFunction,
    topology,
    structureProofs,
    routeCorrelations,
    navigatingEntities,
    targetDrivenEntities,
    mutationTransactions,
    scriptMutationTransactions,
    scriptCommandTransactions,
  } = runtimeAnalysis;
  diagnostics.push(...runtimeAnalysis.diagnostics);

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

  const education = analyzeInspectionEducation({
    target,
    manifests: manifestModelsForKnowledge,
    parsedStructureModels,
  });
  diagnostics.push(...education.diagnostics);

  const causal = analyzeInspectionCausality({
    ...(sourceFingerprint === undefined
      ? {}
      : { sourceFingerprint }),
    graph,
    semanticIr,
    ...(knowledgeCatalog === undefined
      ? {}
      : { knowledgeCatalog }),
    target,
    externalEvidence,
    telemetryEvidence,
    runtimeProbeEvidenceRecords:
      runtimeProbeEvidence.records,
    telemetryEvidenceIntegrity,
    runtimeProbeEvidenceIntegrity,
    telemetryContinuity,
    runtimeProbeDroppedExchanges,
    diagnostics,
    validationCases:
      knowledgeRuntime.validationCases,
  });

  return buildInspectionResult({
    artifactId,
    ...(sourceFingerprint === undefined
      ? {}
      : { sourceFingerprint }),
    files,
    packs,
    target,
    knowledgeCatalogPresent:
      knowledgeCatalog !== undefined,
    sourceIndex,
    semanticIr,
    gameplayIntent,
    runtimeEvidenceStage,
    entityKnowledge,
    knowledgeRuntime,
    runtimeAnalysis,
    education,
    causal,
    telemetryEvents,
    telemetryDroppedEvents,
    runtimeProbeDroppedExchanges,
    diagnostics,
  });
}
