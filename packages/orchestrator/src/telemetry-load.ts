import { readFile } from "node:fs/promises";
import { parseTelemetryBatch } from "../../project-model/src/telemetry-validate.js";
import type { TelemetryBatch } from "../../project-model/src/telemetry.js";

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
