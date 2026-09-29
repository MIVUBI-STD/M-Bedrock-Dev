import { mkdtemp, mkdir, cp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { NORMAL_EXTRACTION_BUDGET } from "../../archive/src/index.js";
import { extractZipSafely, inventoryZip } from "../../archive/src/index.js";
import { sha256File, artifactIdFromFingerprint } from "../../artifact/src/index.js";
import { inspectDirectory } from "./inspect.js";
import type { InspectDirectoryResult, InspectTargetProfile } from "./types.js";
import type { KnowledgeCatalog } from "../../knowledge/src/index.js";
import { analyzeWorldDbNative } from "./world-db-analysis.js";
import { worldDbRuntimeEvidence } from "./world-db-runtime-evidence.js";
import { correlateEmbeddedCommandsWithNativeChunks } from "./embedded-native-correlation.js";
import type { TelemetryBatch, TelemetryEvent } from "../../project-model/src/index.js";
import { isTelemetryBatch, resolveTelemetryEventsForArtifact } from "./telemetry-load.js";
import type { RuntimeProbeTranscript } from "../../project-model/src/index.js";
import { assertRuntimeProbeTranscriptArtifact } from "./runtime-probe-load.js";
import { auditArenaNativeSpatialContent } from "./arena-native-extraction.js";
import { openBedrockLevelDbSnapshot } from "../../../adapters/leveldb/src/index.js";
import { proveArenaVoxelEquivalence } from "./arena-voxel-proof.js";
import { proveArenaBlockEntityEquivalence } from "./arena-block-entity-proof.js";
import { proveArenaStructureInstances } from "./arena-structure-instance-proof.js";
import { proveArenaEntityPopulation } from "./arena-entity-population-proof.js";
import { proveArenaActorPopulation } from "./arena-actor-population-proof.js";
import { proveArenaTickStateEquivalence } from "./arena-tick-state-proof.js";
import { extractPersistedPackIdentities } from "./persisted-pack-identity.js";
import { packIdentityDriftDiagnostics } from "../../../analyzers/diagnostics/src/index.js";
import { partitionArenaProofVolumes, spatialLayoutFromReplicaDiscovery } from "../../../analyzers/topology/src/index.js";
import { deriveScriptArenaLayoutFallback } from "./script-arena-layout-fallback.js";
import { deriveArenaProofCoverage } from "./arena-proof-coverage.js";
import { concludeArenaProof } from "./arena-proof-conclusion.js";
import { deriveArenaReplicaProofQuality } from "./arena-replica-proof-quality.js";
import { createDiagnostic } from "../../diagnostics/src/index.js";
import { deriveArenaStressPlan } from "./arena-stress-plan.js";
import { deriveArenaRepeatedRunValidationPlan } from "./arena-repeated-run-validation.js";
import { localizeArenaRepairSources } from "./arena-repair-localization.js";
import { arenaProofLayerEnabled, planArenaProofExecution } from "./arena-proof-execution-plan.js";
import { deriveGameplayWorldModel } from "./gameplay-world-model.js";

export interface InspectArtifactResult extends InspectDirectoryResult {
  artifactId: string;
  fingerprint: string;
  archiveEntries: number;
}

export async function inspectArtifact(
  path: string,
  target: InspectTargetProfile = {},
  knowledgeCatalog?: KnowledgeCatalog,
  telemetry: readonly TelemetryEvent[] | TelemetryBatch = [],
  runtimeProbeTranscript?: RuntimeProbeTranscript,
): Promise<InspectArtifactResult> {
  const fingerprint = await sha256File(path);
  const artifactId = artifactIdFromFingerprint(fingerprint);
  const telemetryEvents = resolveTelemetryEventsForArtifact(
    telemetry,
    artifactId,
  );
  const telemetryDroppedEvents = isTelemetryBatch(telemetry)
    ? telemetry.droppedEvents ?? 0
    : 0;
  if (runtimeProbeTranscript) {
    assertRuntimeProbeTranscriptArtifact(
      runtimeProbeTranscript,
      artifactId,
    );
  }
  const runtimeProbeResponses =
    runtimeProbeTranscript?.exchanges.map(
      (exchange) => exchange.response,
    ) ?? [];
  const sessionRoot = await mkdtemp(join(tmpdir(), "m-bedrock-inspect-"));
  const sourceRoot = join(sessionRoot, "source");
  const workingRoot = join(sessionRoot, "working");

  try {
    await mkdir(sourceRoot, { recursive: true });
    await mkdir(workingRoot, { recursive: true });
    const inventory = await inventoryZip(path);
    await extractZipSafely(path, sourceRoot, NORMAL_EXTRACTION_BUDGET);
    await cp(sourceRoot, workingRoot, { recursive: true });

    const nativeWorldDb = await analyzeWorldDbNative(workingRoot);
    const result = await inspectDirectory(
      workingRoot,
      artifactId,
      target,
      fingerprint,
      knowledgeCatalog,
      worldDbRuntimeEvidence(nativeWorldDb),
      telemetryEvents,
      telemetryDroppedEvents,
      runtimeProbeResponses,
      runtimeProbeTranscript?.droppedExchanges ?? 0,
    );
    const scriptLayoutFallback =
      result.arenaAnalysis.discovery === undefined
        ? deriveScriptArenaLayoutFallback(
            result.scriptSafeConfig,
            target.arenaRegionContracts ?? [],
          )
        : undefined;

    const spatialLayout =
      result.arenaAnalysis.discovery === undefined
        ? scriptLayoutFallback?.layout
        : spatialLayoutFromReplicaDiscovery(
            result.arenaAnalysis.discovery,
            result.arenaAnalysis.layoutReconciliation?.status ===
              "consistent"
              ? "reconciled"
              : "topology",
          );

    const stressPlan =
      deriveArenaStressPlan(
        spatialLayout,
        result.arenaAnalysis.capacity,
      );
    const repeatedRunPlan =
      deriveArenaRepeatedRunValidationPlan();

    const effectiveRegionPlan =
      result.arenaAnalysis.regionPlan ??
      scriptLayoutFallback?.regionPlan;
    const effectiveRegionClassification =
      result.arenaAnalysis.regionClassification ??
      scriptLayoutFallback?.regionClassification;

    const baseProofVolumes =
      effectiveRegionClassification === undefined
        ? effectiveRegionPlan?.volumes
        : [
            ...effectiveRegionClassification.staticVolumes,
            ...effectiveRegionClassification.mixedVolumes,
            ...effectiveRegionClassification.unknownVolumes,
          ];

    const proofPartition =
      baseProofVolumes === undefined
        ? undefined
        : partitionArenaProofVolumes(
            baseProofVolumes,
            effectiveRegionClassification
              ?.proofExclusionVolumes ?? [],
          );

    const proofVolumes =
      proofPartition?.volumes ??
      baseProofVolumes;

    const proofCoverage = deriveArenaProofCoverage(
      effectiveRegionPlan,
      effectiveRegionClassification,
      proofPartition,
    );

    const entityPopulationProof =
      spatialLayout === undefined
        ? undefined
        : proveArenaEntityPopulation(
            spatialLayout,
            effectiveRegionPlan,
            result.arenaAnalysis.entitySpawnEvidence ?? [],
          );

    let tickStateProof;

    const structureInstanceProof =
      spatialLayout === undefined
        ? undefined
        : proveArenaStructureInstances(
            spatialLayout,
            effectiveRegionPlan,
            [
              ...result.structureRuntime.structurePlacements.map(
                (placement) => ({
                  target: placement.target,
                  ...(placement.position === undefined
                    ? {}
                    : { position: placement.position }),
                  options: placement.options,
                  sourceKind: "command" as const,
                }),
              ),
              ...result.scriptSpatial.structurePlacements.map(
                (placement) => ({
                  ...(placement.identifier === undefined
                    ? {}
                    : { target: placement.identifier }),
                  position: placement.position,
                  options: {},
                  sourceKind: "script" as const,
                }),
              ),
            ],
          );

    const arenaNativeSpatial =
      spatialLayout === undefined
        ? undefined
        : auditArenaNativeSpatialContent(
            spatialLayout,
            nativeWorldDb.chunkContentObservations ?? [],
            {
              ...(effectiveRegionPlan === undefined
                ? {}
                : { regionPlan: effectiveRegionPlan }),
              ...(proofVolumes === undefined
                ? {}
                : { includedVolumes: proofVolumes }),
            },
          );

    const proofExecution =
      spatialLayout === undefined
        ? undefined
        : planArenaProofExecution({
            mode:
              target.arenaProofMode ??
              "progressive",
            nativeSpatial:
              arenaNativeSpatial,
            nativeObservationsTruncated:
              nativeWorldDb
                .chunkContentObservationsTruncated ??
              false,
            blockEntityRecords:
              nativeWorldDb.blockEntityRecords,
            pendingTickRecords:
              nativeWorldDb.pendingTickRecords,
            randomTickRecords:
              nativeWorldDb.randomTickRecords,
            actorRecords:
              nativeWorldDb.actorRecords,
            authoredEntityProof:
              entityPopulationProof,
          });

    if (
      spatialLayout !== undefined &&
      proofExecution !== undefined &&
      arenaProofLayerEnabled(
        proofExecution,
        "tick-state",
      )
    ) {
      tickStateProof =
        proveArenaTickStateEquivalence(
          spatialLayout,
          effectiveRegionPlan,
          nativeWorldDb
            .chunkContentObservations ?? [],
          {
            observationsTruncated:
              nativeWorldDb
                .chunkContentObservationsTruncated ??
              false,
          },
        );
    }

    let arenaVoxelProof;
    let arenaBlockEntityProof;
    let arenaActorPopulationProof;
    let persistedPackIdentity;
    const artifactDiagnostics = [...result.diagnostics];

    for (
      const replica of
        structureInstanceProof?.replicas ?? []
    ) {
      if (replica.status !== "diverged") continue;
      artifactDiagnostics.push(
        createDiagnostic({
          code: "ARENA_STRUCTURE_INSTANCE_DIVERGENCE",
          severity: "critical",
          message:
            `Arena ${replica.arenaId} differs from the canonical arena in resolved structure-placement instances.`,
          data: {
            arenaId: replica.arenaId,
            canonicalInstances:
              replica.canonicalInstances,
            replicaInstances:
              replica.replicaInstances,
            unresolvedPlacements:
              replica.unresolvedPlacements,
            mismatches: replica.mismatches,
          },
        }),
      );
    }

    for (
      const replica of
        tickStateProof?.replicas ?? []
    ) {
      if (replica.status !== "diverged") continue;
      artifactDiagnostics.push(
        createDiagnostic({
          code: "ARENA_TICK_STATE_DIVERGENCE",
          severity: "medium",
          message:
            `Arena ${replica.arenaId} differs from the canonical arena in normalized pending/random tick record state.`,
          data: {
            arenaId: replica.arenaId,
            pendingTickRecords:
              replica.pendingTickRecords,
            randomTickRecords:
              replica.randomTickRecords,
            matchesCanonical:
              replica.matchesCanonical,
            reason: replica.reason,
          },
        }),
      );
    }

    for (
      const replica of
        entityPopulationProof?.replicas ?? []
    ) {
      if (replica.status !== "diverged") continue;
      artifactDiagnostics.push(
        createDiagnostic({
          code: "ARENA_ENTITY_POPULATION_DIVERGENCE",
          severity: "critical",
          message:
            `Arena ${replica.arenaId} differs from the canonical arena in resolved entity-spawn population.`,
          data: {
            arenaId: replica.arenaId,
            canonicalSpawns: replica.canonicalSpawns,
            replicaSpawns: replica.replicaSpawns,
            unresolvedSpawns: replica.unresolvedSpawns,
            mismatches: replica.mismatches,
          },
        }),
      );
    }

    if (nativeWorldDb.status === "scanned") {
      try {
        const reader = await openBedrockLevelDbSnapshot(
          join(workingRoot, "db"),
        );
        try {
          persistedPackIdentity =
            await extractPersistedPackIdentities(reader);

          if (spatialLayout !== undefined) {
            if (
              proofExecution !== undefined &&
              arenaProofLayerEnabled(
                proofExecution,
                "voxel",
              )
            ) {
              arenaVoxelProof =
                await proveArenaVoxelEquivalence(
                  reader,
                  spatialLayout,
                  {
                    ...(effectiveRegionPlan === undefined
                      ? {}
                      : {
                          regionPlan:
                            effectiveRegionPlan,
                        }),
                    ...(proofVolumes === undefined
                      ? {}
                      : {
                          includedVolumes:
                            proofVolumes,
                        }),
                  },
                );
            }

            if (
              proofVolumes !== undefined &&
              proofExecution !== undefined &&
              arenaProofLayerEnabled(
                proofExecution,
                "block-entity",
              )
            ) {
              arenaBlockEntityProof =
                await proveArenaBlockEntityEquivalence(
                  reader,
                  spatialLayout,
                  {
                    includedVolumes: proofVolumes,
                  },
                );
            }

            if (
              proofExecution !== undefined &&
              arenaProofLayerEnabled(
                proofExecution,
                "actor-population",
              )
            ) {
              arenaActorPopulationProof =
                await proveArenaActorPopulation(
                  reader,
                  spatialLayout,
                  effectiveRegionPlan,
                );
            }

            for (
              const replica of
                arenaVoxelProof?.replicas ?? []
            ) {
              if (replica.status !== "diverged") continue;
              artifactDiagnostics.push(
                createDiagnostic({
                  code: "ARENA_VOXEL_DIVERGENCE",
                  severity: "critical",
                  message:
                    `Arena ${replica.arenaId} differs from the canonical arena at decoded voxel level.`,
                  data: {
                    arenaId: replica.arenaId,
                    comparedBlocks: replica.comparedBlocks,
                    unresolvedBlocks: replica.unresolvedBlocks,
                    mismatchCount: replica.mismatchCount,
                    mismatches: replica.mismatches,
                  },
                }),
              );
            }

            for (
              const replica of
                arenaActorPopulationProof?.replicas ?? []
            ) {
              if (replica.status !== "diverged") continue;
              artifactDiagnostics.push(
                createDiagnostic({
                  code: "ARENA_ACTOR_POPULATION_DIVERGENCE",
                  severity: "medium",
                  message:
                    `Arena ${replica.arenaId} differs from the canonical arena in runtime Actor DB population counts.`,
                  data: {
                    arenaId: replica.arenaId,
                    canonicalActors:
                      replica.canonicalActors,
                    replicaActors:
                      replica.replicaActors,
                    mismatchCount:
                      replica.mismatchCount,
                    mismatches:
                      replica.mismatches,
                  },
                }),
              );
            }

            for (
              const replica of
                arenaBlockEntityProof?.replicas ?? []
            ) {
              if (replica.status !== "diverged") continue;
              artifactDiagnostics.push(
                createDiagnostic({
                  code: "ARENA_BLOCK_ENTITY_DIVERGENCE",
                  severity: "critical",
                  message:
                    `Arena ${replica.arenaId} differs from the canonical arena at block-entity NBT level.`,
                  data: {
                    arenaId: replica.arenaId,
                    canonicalEntities:
                      replica.canonicalEntities,
                    replicaEntities:
                      replica.replicaEntities,
                    comparedEntities:
                      replica.comparedEntities,
                    unresolvedChunks:
                      replica.unresolvedChunks,
                    mismatchCount:
                      replica.mismatchCount,
                    mismatches:
                      replica.mismatches,
                  },
                }),
              );
            }
          }
        } finally {
          await reader.close();
        }
      } catch {
        // Native targeted proof is supplementary. Existing scan status remains authoritative.
      }
    }

    const repairLocalization =
      spatialLayout !== undefined &&
      effectiveRegionPlan !== undefined
        ? localizeArenaRepairSources({
            layout: spatialLayout,
            regionPlan: effectiveRegionPlan,
            sources:
              result.arenaAnalysis.authoredSources ?? [],
            ...(arenaVoxelProof === undefined
              ? {}
              : { voxelProof: arenaVoxelProof }),
            ...(structureInstanceProof === undefined
              ? {}
              : {
                  structureProof:
                    structureInstanceProof,
                }),
            ...(entityPopulationProof === undefined
              ? {}
              : {
                  entityPopulationProof,
                }),
            ...(arenaActorPopulationProof === undefined
              ? {}
              : {
                  actorPopulationProof:
                    arenaActorPopulationProof,
                }),
          })
        : undefined;

    const proofConclusion = concludeArenaProof(
      proofCoverage,
      arenaVoxelProof,
      arenaBlockEntityProof,
    );
    const replicaProofQuality =
      deriveArenaReplicaProofQuality(
        proofCoverage,
        arenaVoxelProof,
        arenaNativeSpatial,
        arenaBlockEntityProof,
      );

    if (persistedPackIdentity?.status === "parsed") {
      const behaviorPackUuids = result.packs
        .filter((pack) =>
          pack.type === "behavior_pack" ||
          pack.type === "script_pack" ||
          pack.type === "mixed_pack"
        )
        .flatMap((pack) => pack.uuid ? [pack.uuid] : []);

      artifactDiagnostics.push(
        ...packIdentityDriftDiagnostics(
          behaviorPackUuids,
          persistedPackIdentity.namespaces.map((item) => ({
            identity: item.identity,
          })),
        ),
      );
    }

    const embeddedCommandNativeCorrelations =
      correlateEmbeddedCommandsWithNativeChunks(
        result.structureRuntime.placedEmbeddedCommands,
        nativeWorldDb.chunkSignals,
      );
    const nativeChunkCorrelations = result.structureRuntime.absoluteLoadDestinations.map(
      (destination) => ({
        target: destination.target,
        chunkX: destination.chunkX,
        chunkZ: destination.chunkZ,
        matches: nativeWorldDb.chunkSignals
          .filter((chunk) =>
            chunk.chunkX === destination.chunkX &&
            chunk.chunkZ === destination.chunkZ
          )
          .map((chunk) => ({
            dimensionId: chunk.dimensionId,
            kinds: chunk.kinds,
          })),
      }),
    );
    const finalArenaAnalysis = {
      ...result.arenaAnalysis,
      autoDetected:
        result.arenaAnalysis.autoDetected ||
        scriptLayoutFallback !== undefined,
      ...(spatialLayout === undefined
        ? {}
        : { spatialLayout }),
      stressPlan,
      repeatedRunPlan,
      ...(repairLocalization === undefined
        ? {}
        : { repairLocalization }),
      ...(proofExecution === undefined
        ? {}
        : { proofExecution }),
      ...(result.arenaAnalysis.regionPlan !== undefined ||
          effectiveRegionPlan === undefined
        ? {}
        : { regionPlan: effectiveRegionPlan }),
      ...(result.arenaAnalysis.regionClassification !== undefined ||
          effectiveRegionClassification === undefined
        ? {}
        : {
            regionClassification:
              effectiveRegionClassification,
          }),
      ...(arenaNativeSpatial === undefined
        ? {}
        : { nativeSpatial: arenaNativeSpatial }),
      ...(arenaVoxelProof === undefined
        ? {}
        : { voxelProof: arenaVoxelProof }),
      ...(arenaBlockEntityProof === undefined
        ? {}
        : {
            blockEntityProof:
              arenaBlockEntityProof,
          }),
      ...(structureInstanceProof === undefined
        ? {}
        : { structureInstanceProof }),
      ...(entityPopulationProof === undefined
        ? {}
        : { entityPopulationProof }),
      ...(arenaActorPopulationProof === undefined
        ? {}
        : {
            actorPopulationProof:
              arenaActorPopulationProof,
          }),
      ...(tickStateProof === undefined
        ? {}
        : { tickStateProof }),
      ...(proofPartition === undefined
        ? {}
        : { proofPartition }),
      ...(proofCoverage === undefined
        ? {}
        : { proofCoverage }),
      proofConclusion,
      ...(replicaProofQuality.length === 0
        ? {}
        : { replicaProofQuality }),
    };

    const finalGameplayWorld =
      deriveGameplayWorldModel({
        artifactId,
        intent: result.gameplayIntent.model,
        arena: finalArenaAnalysis,
        scriptSpatial: result.scriptSpatial,
        semanticIr: {
          stateSurfaces:
            result.semanticIr.stateSurfaces,
          stateOperations:
            result.semanticIr.stateOperations,
        },
        broadWrites:
          result.stateAnalysis.broadWrites,
        structures: {
          definitions: result.structures,
          loads:
            result.structureRuntime.loads,
          unresolvedLoads:
            result.structureRuntime
              .unresolvedLoads,
          placements:
            result.structureRuntime
              .structurePlacements.length +
            result.scriptSpatial
              .structurePlacements.length,
          runtimeLogicLoads:
            result.structureRuntime
              .runtimeLogicLoads,
        },
        entities: {
          definitions: result.entities,
          knowledgePrerequisiteGaps:
            result.entityKnowledge
              .prerequisiteGaps,
          staticAnalysisLimits:
            result.entityKnowledge
              .staticAnalysisLimits,
        },
      });

    return {
      artifactId,
      fingerprint,
      archiveEntries: inventory.entries.length,
      ...result,
      gameplayWorld: finalGameplayWorld,
      arenaAnalysis: finalArenaAnalysis,
      worldDatabase: {
        ...result.worldDatabase,
        nativeScan: nativeWorldDb,
        ...(persistedPackIdentity === undefined
          ? {}
          : { persistedPackIdentity }),
      },
      diagnostics: artifactDiagnostics,
      structureRuntime: {
        ...result.structureRuntime,
        nativeChunkCorrelations,
        embeddedCommandNativeCorrelations,
      },
    };
  } finally {
    await rm(sessionRoot, { recursive: true, force: true });
  }
}
