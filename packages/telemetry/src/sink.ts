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
  const eventIds = new Set<string>();
  let dropped = 0;

  return {
    emit(event) {
      if (eventIds.has(event.eventId)) {
        throw new Error(
          "Duplicate telemetry eventId emitted into buffer: " +
          event.eventId,
        );
      }

      events.push(event);
      eventIds.add(event.eventId);

      if (events.length > maxEvents) {
        const overflow = events.length - maxEvents;
        const removed = events.splice(0, overflow);
        for (const item of removed) eventIds.delete(item.eventId);
        dropped += overflow;
      }
    },
    get size() {
      return events.length;
    },
    get dropped() {
      return dropped;
    },
    snapshot() {
      return events.map((event) => ({
        ...event,
        scope: { ...event.scope },
      }));
    },
    clear() {
      events.length = 0;
      eventIds.clear();
      dropped = 0;
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
        ...(dropped === 0 ? {} : { droppedEvents: dropped }),
        events: this.snapshot(),
      };
    },
    drainBatch(input = {}): TelemetryBatch {
      const batch = this.batch(input);
      this.clear();
      return batch;
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
