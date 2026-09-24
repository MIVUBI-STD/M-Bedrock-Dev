import { readFile } from "node:fs/promises";
import {
  parseTelemetryBatch,
} from "../../project-model/src/telemetry-validate.js";
import type {
  TelemetryBatch,
  TelemetryEvent,
} from "../../project-model/src/telemetry.js";
import {
  reassembleTelemetryFrames,
  reassembleTelemetryFrameSet,
  type TelemetryFrame,
  type TelemetryFrameSet,
} from "../telemetry/src/framing.js";

export function isTelemetryBatch(
  telemetry: readonly TelemetryEvent[] | TelemetryBatch,
): telemetry is TelemetryBatch {
  return !Array.isArray(telemetry);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asTelemetryFrameArray(value: unknown): readonly TelemetryFrame[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value as readonly TelemetryFrame[];
}

function parseJsonLines(text: string, path: string): unknown[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error("Telemetry file " + path + " is empty.");
  }

  return lines.map((line, index) => {
    try {
      return JSON.parse(line) as unknown;
    } catch (error) {
      throw new Error(
        "Telemetry JSONL line " +
        (index + 1) +
        " in " +
        path +
        " is invalid JSON: " +
        (error instanceof Error ? error.message : String(error)),
      );
    }
  });
}

export function parseTelemetryDocument(
  input: unknown,
): TelemetryBatch {
  if (Array.isArray(input)) {
    return reassembleTelemetryFrames(
      input as readonly TelemetryFrame[],
    );
  }

  if (
    isRecord(input) &&
    input.schemaVersion === 1 &&
    Array.isArray(input.frames)
  ) {
    return reassembleTelemetryFrameSet(
      input as unknown as TelemetryFrameSet,
    );
  }

  return parseTelemetryBatch(input);
}

export function parseTelemetryText(
  text: string,
  path = "<telemetry>",
): TelemetryBatch {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Telemetry file " + path + " is empty.");
  }

  try {
    return parseTelemetryDocument(JSON.parse(trimmed) as unknown);
  } catch (jsonError) {
    // Only fall back to JSONL when the whole document itself is not valid JSON.
    try {
      JSON.parse(trimmed);
    } catch {
      const frames = parseJsonLines(trimmed, path);
      return reassembleTelemetryFrames(
        frames as readonly TelemetryFrame[],
      );
    }

    throw jsonError;
  }
}

export async function loadTelemetryFile(
  path: string,
): Promise<TelemetryBatch> {
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    throw new Error(
      "Failed to read telemetry file " +
      path +
      ": " +
      (error instanceof Error ? error.message : String(error)),
    );
  }

  try {
    return parseTelemetryText(text, path);
  } catch (error) {
    throw new Error(
      "Failed to parse telemetry file " +
      path +
      ": " +
      (error instanceof Error ? error.message : String(error)),
    );
  }
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
