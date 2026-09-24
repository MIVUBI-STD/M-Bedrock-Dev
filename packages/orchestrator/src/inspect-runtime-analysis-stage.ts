import {
  entityHasConfiguredTargeting,
  entityHasNavigation,
  entityRuntimeKey,
} from "../../../analyzers/entities/src/index.js";
import { structureRuntimeDiagnostics } from "../../../analyzers/diagnostics/src/structure-runtime-findings.js";
import type { DiagnosticFinding } from "../../diagnostics/src/index.js";
import type { InspectTargetProfile } from "./types.js";
import type { InspectionSourceIndex } from "./inspect-source-index.js";
import { analyzeFunctionTopology } from "./topology-analysis.js";
import { analyzeStructureAndChunkRuntime } from "./structure-runtime-analysis.js";
import { correlateScriptStructureLoads } from "./script-structure-correlation.js";
import { derivePlacedEmbeddedCommands } from "./structure-placement-analysis.js";
import { derivePlacementProofs } from "./structure-proof-analysis.js";
import { correlateRouteMutations } from "./route-mutation-analysis.js";
import { analyzeMutationTransactionOrdering } from "./mutation-transaction-analysis.js";
import { analyzeScriptMutationTransactions } from "./script-mutation-transaction-analysis.js";
import { analyzeScriptCommandMutationTransactions } from "./script-command-transaction-analysis.js";

export interface InspectionRuntimeAnalysisInput {
  target: InspectTargetProfile;
  parsedFunctions: InspectionSourceIndex["parsedFunctions"];
  parsedScripts: InspectionSourceIndex["parsedScripts"];
  parsedEntities: InspectionSourceIndex["parsedEntities"];
  parsedStructureModels:
    InspectionSourceIndex["parsedStructureModels"];
}

export function analyzeInspectionRuntimeState(
  input: InspectionRuntimeAnalysisInput,
) {
  const parsedFunctionModels =
    input.parsedFunctions.map((item) => item.parsed);

  const parsedStructureSummaries =
    input.parsedStructureModels.map((item) => ({
      identifier: item.identifier,
      relativePath: item.node.source.relativePath,
      ...(item.size ? { size: item.size } : {}),
      semantics: item.semantics,
    }));

  const structureRuntime =
    analyzeStructureAndChunkRuntime(
      parsedFunctionModels,
      parsedStructureSummaries,
    );

  const scriptStructureLoads =
    correlateScriptStructureLoads(
      input.parsedScripts.map((item) => item.parsed),
      parsedStructureSummaries,
    );

  const sourceByFunction = new Map(
    input.parsedFunctions.map((item) => [
      item.parsed.identifier,
      item.node.source,
    ]),
  );

  const diagnostics: DiagnosticFinding[] = [
    ...structureRuntimeDiagnostics(
      structureRuntime,
      sourceByFunction,
    ),
  ];

  const placedEmbeddedCommands =
    structureRuntime.correlations.flatMap(
      (correlation) => {
        if (correlation.status !== "resolved") {
          return [];
        }

        const parsed =
          input.parsedStructureModels.find(
            (item) =>
              item.identifier ===
              correlation.load.semantics.name,
          );
        if (!parsed) return [];

        return derivePlacedEmbeddedCommands(
          {
            ...(correlation.load.semantics.position
              ? {
                  position:
                    correlation.load.semantics.position,
                }
              : {}),
            ...(correlation.load.semantics.rotation
              ? {
                  rotation:
                    correlation.load.semantics.rotation,
                }
              : {}),
            ...(correlation.load.semantics.mirror
              ? {
                  mirror:
                    correlation.load.semantics.mirror,
                }
              : {}),
          },
          parsed.size,
          parsed.embeddedCommands.map(
            (item) => item.block,
          ),
        ).map((item) => ({
          target:
            correlation.load.semantics.name,
          flatIndex: item.flatIndex,
          worldX: item.world.x,
          worldY: item.world.y,
          worldZ: item.world.z,
          chunkX: Math.floor(item.world.x / 16),
          chunkZ: Math.floor(item.world.z / 16),
          command: item.command,
          confidence: item.confidence,
        }));
      },
    );

  const topology =
    analyzeFunctionTopology(parsedFunctionModels);
  diagnostics.push(
    ...topology.stateDiagnostics,
    ...topology.topologyDiagnostics,
  );

  const structureProofs = derivePlacementProofs(
    structureRuntime,
    parsedFunctionModels,
  );

  const routeCorrelations = correlateRouteMutations(
    input.target.routeCorridors ?? [],
    topology,
    structureProofs,
    input.target.staticExecutionDimension,
  );

  const navigatingEntities = new Map(
    input.parsedEntities
      .map((item) => item.parsed)
      .filter(entityHasNavigation)
      .map((entity) => [
        entityRuntimeKey(entity),
        [entity.source] as const,
      ]),
  );

  const targetDrivenEntities = new Map(
    input.parsedEntities
      .map((item) => item.parsed)
      .filter(entityHasConfiguredTargeting)
      .map((entity) => [
        entityRuntimeKey(entity),
        [entity.source] as const,
      ]),
  );

  const mutationTransactions =
    analyzeMutationTransactionOrdering(
      parsedFunctionModels,
      structureProofs,
      input.target.mutationDependentActions ?? [],
    );

  const scriptMutationTransactions =
    analyzeScriptMutationTransactions(
      input.parsedScripts.map((item) => item.parsed),
      input.target.mutationDependentActions ?? [],
    );

  const scriptCommandTransactions =
    analyzeScriptCommandMutationTransactions(
      input.parsedScripts.map((item) => item.parsed),
      parsedStructureSummaries,
      input.target.mutationDependentActions ?? [],
    );

  return {
    parsedFunctionModels,
    parsedStructureSummaries,
    structureRuntime,
    scriptStructureLoads,
    sourceByFunction,
    placedEmbeddedCommands,
    topology,
    structureProofs,
    routeCorrelations,
    navigatingEntities,
    targetDrivenEntities,
    mutationTransactions,
    scriptMutationTransactions,
    scriptCommandTransactions,
    diagnostics,
  };
}
