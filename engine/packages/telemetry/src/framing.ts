import { parseTelemetryBatch } from "../../project-model/src/index.js";
import type { TelemetryBatch } from "../../project-model/src/index.js";

export interface TelemetryFrame {
  schemaVersion: 1;
  batchId: string;
  partIndex: number;
  partCount: number;
  checksum: string;
  payload: string;
}

export interface TelemetryFrameOptions {
  batchId: string;
  maxPayloadCharacters: number;
}

export interface TelemetryFrameSet {
  schemaVersion: 1;
  frames: readonly TelemetryFrame[];
}

function fnv1a32(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function telemetryBatchChecksum(
  batch: TelemetryBatch,
): string {
  return fnv1a32(JSON.stringify(batch));
}

export function frameTelemetryBatch(
  batch: TelemetryBatch,
  options: TelemetryFrameOptions,
): TelemetryFrame[] {
  if (!options.batchId.trim()) {
    throw new Error("batchId must be a non-empty string.");
  }
  if (
    !Number.isInteger(options.maxPayloadCharacters) ||
    options.maxPayloadCharacters < 1
  ) {
    throw new Error(
      "maxPayloadCharacters must be a positive integer.",
    );
  }

  const serialized = JSON.stringify(batch);
  const checksum = fnv1a32(serialized);
  const chunks: string[] = [];

  for (
    let offset = 0;
    offset < serialized.length;
    offset += options.maxPayloadCharacters
  ) {
    chunks.push(
      serialized.slice(
        offset,
        offset + options.maxPayloadCharacters,
      ),
    );
  }

  if (chunks.length === 0) chunks.push("");

  return chunks.map((payload, partIndex) => ({
    schemaVersion: 1,
    batchId: options.batchId,
    partIndex,
    partCount: chunks.length,
    checksum,
    payload,
  }));
}

export function reassembleTelemetryFrames(
  frames: readonly TelemetryFrame[],
): TelemetryBatch {
  if (frames.length === 0) {
    throw new Error("Telemetry frame set is empty.");
  }

  const first = frames[0]!;
  if (first.schemaVersion !== 1) {
    throw new Error("Telemetry frame schemaVersion must be 1.");
  }

  const expectedCount = first.partCount;
  const expectedBatchId = first.batchId;
  const expectedChecksum = first.checksum;

  if (
    !Number.isInteger(expectedCount) ||
    expectedCount < 1 ||
    frames.length !== expectedCount
  ) {
    throw new Error(
      "Telemetry frame set is incomplete: expected " +
      expectedCount +
      " parts but received " +
      frames.length +
      ".",
    );
  }

  const byIndex = new Map<number, TelemetryFrame>();
  for (const frame of frames) {
    if (frame.schemaVersion !== 1) {
      throw new Error("Telemetry frame schemaVersion must be 1.");
    }
    if (frame.batchId !== expectedBatchId) {
      throw new Error("Telemetry frame batchId mismatch.");
    }
    if (frame.partCount !== expectedCount) {
      throw new Error("Telemetry frame partCount mismatch.");
    }
    if (frame.checksum !== expectedChecksum) {
      throw new Error("Telemetry frame checksum metadata mismatch.");
    }
    if (
      !Number.isInteger(frame.partIndex) ||
      frame.partIndex < 0 ||
      frame.partIndex >= expectedCount
    ) {
      throw new Error("Telemetry frame partIndex is invalid.");
    }
    if (byIndex.has(frame.partIndex)) {
      throw new Error(
        "Duplicate telemetry frame partIndex: " +
        frame.partIndex,
      );
    }
    byIndex.set(frame.partIndex, frame);
  }

  const serialized = Array.from(
    { length: expectedCount },
    (_, index) => {
      const frame = byIndex.get(index);
      if (!frame) {
        throw new Error(
          "Missing telemetry frame partIndex: " + index,
        );
      }
      return frame.payload;
    },
  ).join("");

  if (fnv1a32(serialized) !== expectedChecksum) {
    throw new Error("Telemetry frame checksum validation failed.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch (error) {
    throw new Error(
      "Reassembled telemetry payload is not valid JSON: " +
      (error instanceof Error ? error.message : String(error)),
    );
  }

  return parseTelemetryBatch(parsed);
}


export function frameTelemetryBatchSet(
  batch: TelemetryBatch,
  options: TelemetryFrameOptions,
): TelemetryFrameSet {
  return {
    schemaVersion: 1,
    frames: frameTelemetryBatch(batch, options),
  };
}

export function reassembleTelemetryFrameSet(
  set: TelemetryFrameSet,
): TelemetryBatch {
  if (set.schemaVersion !== 1) {
    throw new Error("Telemetry frame set schemaVersion must be 1.");
  }
  if (!Array.isArray(set.frames)) {
    throw new Error("Telemetry frame set frames must be an array.");
  }
  return reassembleTelemetryFrames(set.frames);
}
