import { readFile } from "node:fs/promises";
import { parseTelemetryBatch } from "../../project-model/src/telemetry-validate.js";
import type { TelemetryBatch, TelemetryEvent } from "../../project-model/src/telemetry.js";\n\nexport function isTelemetryBatch(\n  telemetry: readonly TelemetryEvent[] | TelemetryBatch,\n): telemetry is TelemetryBatch {\n  return !Array.isArray(telemetry);\n}

export async function loadTelemetryFile(path: string): Promise<TelemetryBatch> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch (error) {
    throw new Error(
      "Failed to read telemetry file " +
      path +
      ": " +
      (error instanceof Error ? error.message : String(error)),
    );
  }

  return parseTelemetryBatch(parsed);
}


export function resolveTelemetryEventsForArtifact(
  telemetry: readonly TelemetryEvent[] | TelemetryBatch,
  artifactId: string,
): readonly TelemetryEvent[] {
  if (!isTelemetryBatch(telemetry)) return telemetry;
  if (
    telemetry.artifactId !== undefined &&
    telemetry.artifactId !== artifactId
  ) {
    throw new Error(
      "Telemetry artifactId " +
      telemetry.artifactId +
      " does not match inspected artifact " +
      artifactId +
      ".",
    );
  }
  return telemetry.events;
}
