import { mkdtemp, mkdir, cp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { NORMAL_EXTRACTION_BUDGET } from "../../archive/src/budgets.js";
import { extractZipSafely, inventoryZip } from "../../archive/src/zip-transport.js";
import { sha256File, artifactIdFromFingerprint } from "../../artifact/src/fingerprint.js";
import { inspectDirectory } from "./inspect.js";
import type { InspectDirectoryResult, InspectTargetProfile } from "./types.js";
import type { KnowledgeCatalog } from "../../knowledge/src/types.js";
import { analyzeWorldDbNative } from "./world-db-analysis.js";
import { worldDbRuntimeEvidence } from "./world-db-runtime-evidence.js";
import { correlateEmbeddedCommandsWithNativeChunks } from "./embedded-native-correlation.js";
import type { TelemetryBatch, TelemetryEvent } from "../../project-model/src/telemetry.js";
import { isTelemetryBatch, resolveTelemetryEventsForArtifact } from "./telemetry-load.js";
import type { RuntimeProbeTranscript } from "../../project-model/src/runtime-probe.js";
import { assertRuntimeProbeTranscriptArtifact } from "./runtime-probe-load.js";

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
  const telemetryDroppedEvents = Array.isArray(telemetry)
    ? 0
    : telemetry.droppedEvents ?? 0;
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
    );
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
      worldDatabase: {
        ...result.worldDatabase,
        nativeScan: nativeWorldDb,
      },
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
