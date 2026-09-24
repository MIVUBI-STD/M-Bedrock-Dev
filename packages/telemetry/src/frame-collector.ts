import type { TelemetryBatch } from "../../project-model/src/telemetry.js";
import {
  reassembleTelemetryFrames,
  type TelemetryFrame,
} from "./framing.js";

export type TelemetryFrameCollectionStatus =
  | "pending"
  | "duplicate"
  | "complete";

export interface TelemetryFrameCollectionResult {
  status: TelemetryFrameCollectionStatus;
  batchId: string;
  receivedParts: number;
  expectedParts: number;
  batch?: TelemetryBatch;
  evictedBatchId?: string;
}

export interface TelemetryFrameCollectorOptions {
  maxPendingBatches?: number;
  maxFramesPerBatch?: number;
}

export interface TelemetryFrameCollector {
  readonly pendingBatches: number;
  accept(frame: TelemetryFrame): TelemetryFrameCollectionResult;
  discard(batchId: string): boolean;
  clear(): void;
}

interface PendingBatch {
  batchId: string;
  partCount: number;
  checksum: string;
  frames: Map<number, TelemetryFrame>;
  order: number;
}

function validateFrameEnvelope(
  frame: TelemetryFrame,
  maxFramesPerBatch: number,
): void {
  if (frame.schemaVersion !== 1) {
    throw new Error("Telemetry frame schemaVersion must be 1.");
  }
  if (!frame.batchId.trim()) {
    throw new Error("Telemetry frame batchId must be non-empty.");
  }
  if (
    !Number.isInteger(frame.partCount) ||
    frame.partCount < 1 ||
    frame.partCount > maxFramesPerBatch
  ) {
    throw new Error(
      "Telemetry frame partCount exceeds collector bounds.",
    );
  }
  if (
    !Number.isInteger(frame.partIndex) ||
    frame.partIndex < 0 ||
    frame.partIndex >= frame.partCount
  ) {
    throw new Error("Telemetry frame partIndex is invalid.");
  }
  if (!frame.checksum.trim()) {
    throw new Error("Telemetry frame checksum must be non-empty.");
  }
  if (typeof frame.payload !== "string") {
    throw new Error("Telemetry frame payload must be a string.");
  }
}

function sameFrame(a: TelemetryFrame, b: TelemetryFrame): boolean {
  return (
    a.schemaVersion === b.schemaVersion &&
    a.batchId === b.batchId &&
    a.partIndex === b.partIndex &&
    a.partCount === b.partCount &&
    a.checksum === b.checksum &&
    a.payload === b.payload
  );
}

export function createTelemetryFrameCollector(
  options: TelemetryFrameCollectorOptions = {},
): TelemetryFrameCollector {
  const maxPendingBatches = options.maxPendingBatches ?? 8;
  const maxFramesPerBatch = options.maxFramesPerBatch ?? 256;

  if (!Number.isInteger(maxPendingBatches) || maxPendingBatches < 1) {
    throw new Error("maxPendingBatches must be a positive integer.");
  }
  if (!Number.isInteger(maxFramesPerBatch) || maxFramesPerBatch < 1) {
    throw new Error("maxFramesPerBatch must be a positive integer.");
  }

  const pending = new Map<string, PendingBatch>();
  let order = 0;

  const evictOldest = (): string | undefined => {
    if (pending.size < maxPendingBatches) return undefined;

    let oldest: PendingBatch | undefined;
    for (const item of pending.values()) {
      if (!oldest || item.order < oldest.order) oldest = item;
    }
    if (!oldest) return undefined;
    pending.delete(oldest.batchId);
    return oldest.batchId;
  };

  return {
    get pendingBatches() {
      return pending.size;
    },

    accept(frame) {
      validateFrameEnvelope(frame, maxFramesPerBatch);

      let state = pending.get(frame.batchId);
      let evictedBatchId: string | undefined;

      if (!state) {
        evictedBatchId = evictOldest();
        order += 1;
        state = {
          batchId: frame.batchId,
          partCount: frame.partCount,
          checksum: frame.checksum,
          frames: new Map(),
          order,
        };
        pending.set(frame.batchId, state);
      }

      if (
        state.partCount !== frame.partCount ||
        state.checksum !== frame.checksum
      ) {
        throw new Error(
          "Telemetry frame metadata conflicts with pending batch " +
          frame.batchId +
          ".",
        );
      }

      const existing = state.frames.get(frame.partIndex);
      if (existing) {
        if (!sameFrame(existing, frame)) {
          throw new Error(
            "Telemetry frame part conflicts with previously received part " +
            frame.partIndex +
            ".",
          );
        }
        return {
          status: "duplicate",
          batchId: frame.batchId,
          receivedParts: state.frames.size,
          expectedParts: state.partCount,
          ...(evictedBatchId === undefined
            ? {}
            : { evictedBatchId }),
        };
      }

      state.frames.set(frame.partIndex, frame);

      if (state.frames.size < state.partCount) {
        return {
          status: "pending",
          batchId: frame.batchId,
          receivedParts: state.frames.size,
          expectedParts: state.partCount,
          ...(evictedBatchId === undefined
            ? {}
            : { evictedBatchId }),
        };
      }

      const batch = reassembleTelemetryFrames(
        [...state.frames.values()],
      );
      pending.delete(frame.batchId);

      return {
        status: "complete",
        batchId: frame.batchId,
        receivedParts: state.partCount,
        expectedParts: state.partCount,
        batch,
        ...(evictedBatchId === undefined
          ? {}
          : { evictedBatchId }),
      };
    },

    discard(batchId) {
      return pending.delete(batchId);
    },

    clear() {
      pending.clear();
    },
  };
}
