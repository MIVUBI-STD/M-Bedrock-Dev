import type { TelemetryBatch } from "../../project-model/src/telemetry.js";
import type { BufferedTelemetrySink } from "./types.js";

export interface TelemetryBatchTransport {
  send(batch: TelemetryBatch): void;
}

export interface TelemetryFlushController {
  readonly pending: number;
  flush(): TelemetryBatch | undefined;
}

export interface TelemetryFlushOptions {
  buffer: BufferedTelemetrySink;
  transport: TelemetryBatchTransport;
  sessionId?: string;
  artifactId?: string;
  minimumEvents?: number;
}

export function createTelemetryFlushController(
  options: TelemetryFlushOptions,
): TelemetryFlushController {
  const minimumEvents = options.minimumEvents ?? 1;
  if (!Number.isInteger(minimumEvents) || minimumEvents < 1) {
    throw new Error("minimumEvents must be a positive integer.");
  }

  return {
    get pending() {
      return options.buffer.size;
    },

    flush() {
      if (options.buffer.size < minimumEvents) return undefined;

      const batch = options.buffer.batch({
        ...(options.sessionId === undefined
          ? {}
          : { sessionId: options.sessionId }),
        ...(options.artifactId === undefined
          ? {}
          : { artifactId: options.artifactId }),
      });

      // Clear only after successful synchronous transport.
      // If send throws, the buffer remains intact for retry.
      options.transport.send(batch);
      options.buffer.clear();
      return batch;
    },
  };
}

export function createJsonBatchTransport(
  write: (payload: string) => void,
): TelemetryBatchTransport {
  return {
    send(batch) {
      write(JSON.stringify(batch));
    },
  };
}
