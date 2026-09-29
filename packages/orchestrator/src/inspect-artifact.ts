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
import { extractPersistedPackIdentities } from "./persisted-pack-identity.js";
import { packIdentityDriftDiagnostics } from "../../../analyzers/diagnostics/src/index.js";
import { partitionArenaProofVolumes } from "../../../analyzers/topology/src/index.js";
import { deriveArenaProofCoverage } from "./arena-proof-coverage.js";
import { concludeArenaProof } from "./arena-proof-conclusion.js";
import { createDiagnostic } from "../../diagnostics/src/index.js";

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
    const baseProofVolumes =
      result.arenaAnalysis.regionClassification === undefined
        ? result.arenaAnalysis.regionPlan?.volumes
        : [
            ...result.arenaAnalysis.regionClassification.staticVolumes,
            ...result.arenaAnalysis.regionClassification.mixedVolumes,
            ...result.arenaAnalysis.regionClassification.unknownVolumes,
          ];

    const proofPartition =
      baseProofVolumes === undefined
        ? undefined
        : partitionArenaProofVolumes(
            baseProofVolumes,
            result.arenaAnalysis.regionClassification
              ?.proofExclusionVolumes ?? [],
          );

    const proofVolumes =
      proofPartition?.volumes ??
      baseProofVolumes;

    const proofCoverage = deriveArenaProofCoverage(
      result.arenaAnalysis.regionPlan,
      result.arenaAnalysis.regionClassification,
      proofPartition,
    );

    const arenaNativeSpatial =
      result.arenaAnalysis.discovery === undefined
        ? undefined
        : auditArenaNativeSpatialContent(
            result.arenaAnalysis.discovery,
            nativeWorldDb.chunkContentObservations ?? [],
            {
              ...(result.arenaAnalysis.regionPlan === undefined
                ? {}
                : { regionPlan: result.arenaAnalysis.regionPlan }),
              ...(proofVolumes === undefined
                ? {}
                : { includedVolumes: proofVolumes }),
            },
          );

    let arenaVoxelProof;
    let persistedPackIdentity;
    const artifactDiagnostics = [...result.diagnostics];

    if (nativeWorldDb.status === "scanned") {
      try {
        const reader = await openBedrockLevelDbSnapshot(
          join(workingRoot, "db"),
        );
        try {
          persistedPackIdentity =
            await extractPersistedPackIdentities(reader);

          if (result.arenaAnalysis.discovery !== undefined) {
            arenaVoxelProof = await proveArenaVoxelEquivalence(
              reader,
              result.arenaAnalysis.discovery,
              {
                ...(result.arenaAnalysis.regionPlan === undefined
                  ? {}
                  : {
                      regionPlan:
                        result.arenaAnalysis.regionPlan,
                    }),
                ...(proofVolumes === undefined
                  ? {}
                  : { includedVolumes: proofVolumes }),
              },
            );

            for (const replica of arenaVoxelProof.replicas) {
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
          }
        } finally {
          await reader.close();
        }
      } catch {
        // Native targeted proof is supplementary. Existing scan status remains authoritative.
      }
    }

    const proofConclusion = concludeArenaProof(
      proofCoverage,
      arenaVoxelProof,
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
    return {
      artifactId,
      fingerprint,
      archiveEntries: inventory.entries.length,
      ...result,
      arenaAnalysis: {
        ...result.arenaAnalysis,
        ...(arenaNativeSpatial === undefined
          ? {}
          : { nativeSpatial: arenaNativeSpatial }),
        ...(arenaVoxelProof === undefined
          ? {}
          : { voxelProof: arenaVoxelProof }),
        ...(proofPartition === undefined
          ? {}
          : { proofPartition }),
        ...(proofCoverage === undefined
          ? {}
          : { proofCoverage }),
        proofConclusion,
      },
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
