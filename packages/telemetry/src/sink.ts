import { validateTelemetryEvent } from "../../project-model/src/telemetry-validate.js";
import type {
  TelemetryBatch,
  TelemetryEvent,
} from "../../project-model/src/telemetry.js";
import type {
  BufferedTelemetrySink,
  TelemetrySink,
} from "./types.js";

export function createBufferedTelemetrySink(
  maxEvents = 1000,
): BufferedTelemetrySink {
  if (!Number.isInteger(maxEvents) || maxEvents < 1) {
    throw new Error("maxEvents must be a positive integer.");
  }

  const events: TelemetryEvent[] = [];

  return {
    emit(event) {
      events.push(event);
      if (events.length > maxEvents) {
        events.splice(0, events.length - maxEvents);
      }
    },
    get size() {
      return events.length;
    },
    snapshot() {
      return events.map((event) => ({
        ...event,
        scope: { ...event.scope },
      }));
    },
    clear() {
      events.length = 0;
    },
    batch(input = {}): TelemetryBatch {
      return {
        schemaVersion: 1,
        ...(input.sessionId === undefined
          ? {}
          : { sessionId: input.sessionId }),
        ...(input.artifactId === undefined
          ? {}
          : { artifactId: input.artifactId }),
        events: this.snapshot(),
      };
    },
  };
}

export function createFanoutTelemetrySink(
  sinks: readonly TelemetrySink[],
): TelemetrySink {
  return {
    emit(event) {
      for (const sink of sinks) sink.emit(event);
    },
  };
}

export function createCallbackTelemetrySink(
  callback: (event: TelemetryEvent) => void,
): TelemetrySink {
  return {
    emit: callback,
  };
}


export function createValidatingTelemetrySink(
  sink: TelemetrySink,
): TelemetrySink {
  return {
    emit(event) {
      const errors = validateTelemetryEvent(event);
      if (errors.length > 0) {
        throw new Error("Invalid emitted telemetry event: " + errors.join("; "));
      }
      sink.emit(event);
    },
  };
}

export function createJsonLineTelemetrySink(
  writeLine: (line: string) => void,
): TelemetrySink {
  return {
    emit(event) {
      writeLine(JSON.stringify(event));
    },
  };
}
