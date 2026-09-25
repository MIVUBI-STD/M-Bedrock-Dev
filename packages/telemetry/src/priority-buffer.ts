import type {
  TelemetryBatch,
  TelemetryEvent,
} from "../../project-model/src/index.js";
import {
  telemetryEventPriority,
  type TelemetryEventPriority,
} from "./profile.js";
import type { BufferedTelemetrySink } from "./types.js";

const PRIORITY_RANK: Readonly<Record<TelemetryEventPriority, number>> = {
  low: 0,
  normal: 1,
  high: 2,
  critical: 3,
};

export interface PriorityBufferedTelemetrySink
  extends BufferedTelemetrySink {
  droppedByPriority(): Readonly<Record<TelemetryEventPriority, number>>;
}

export function createPriorityBufferedTelemetrySink(
  maxEvents = 1000,
): PriorityBufferedTelemetrySink {
  if (!Number.isInteger(maxEvents) || maxEvents < 1) {
    throw new Error("maxEvents must be a positive integer.");
  }

  const events: TelemetryEvent[] = [];
  const eventIds = new Set<string>();
  let dropped = 0;
  const droppedByPriority: Record<TelemetryEventPriority, number> = {
    low: 0,
    normal: 0,
    high: 0,
    critical: 0,
  };

  const countDrop = (event: TelemetryEvent): void => {
    dropped += 1;
    droppedByPriority[telemetryEventPriority(event)] += 1;
  };

  const removeAt = (index: number): TelemetryEvent => {
    const [removed] = events.splice(index, 1);
    if (!removed) {
      throw new Error("Telemetry priority buffer internal eviction failed.");
    }
    eventIds.delete(removed.eventId);
    return removed;
  };

  return {
    emit(event) {
      if (eventIds.has(event.eventId)) {
        throw new Error(
          "Duplicate telemetry eventId emitted into priority buffer: " +
          event.eventId,
        );
      }

      if (events.length < maxEvents) {
        events.push(event);
        eventIds.add(event.eventId);
        return;
      }

      const incomingRank = PRIORITY_RANK[telemetryEventPriority(event)];
      let lowestRank = Number.POSITIVE_INFINITY;
      let lowestIndex = -1;

      for (let index = 0; index < events.length; index += 1) {
        const rank = PRIORITY_RANK[telemetryEventPriority(events[index]!)];
        if (rank < lowestRank) {
          lowestRank = rank;
          lowestIndex = index;
        }
      }

      if (incomingRank <= lowestRank || lowestIndex < 0) {
        countDrop(event);
        return;
      }

      const evicted = removeAt(lowestIndex);
      countDrop(evicted);
      events.push(event);
      eventIds.add(event.eventId);
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
      for (const key of Object.keys(droppedByPriority) as TelemetryEventPriority[]) {
        droppedByPriority[key] = 0;
      }
    },

    batch(input = {}): TelemetryBatch {
      return {
        schemaVersion: 1,
        ...(input.sessionId === undefined ? {} : { sessionId: input.sessionId }),
        ...(input.artifactId === undefined ? {} : { artifactId: input.artifactId }),
        ...(dropped === 0 ? {} : { droppedEvents: dropped }),
        events: this.snapshot(),
      };
    },

    drainBatch(input = {}): TelemetryBatch {
      const batch = this.batch(input);
      this.clear();
      return batch;
    },

    droppedByPriority() {
      return { ...droppedByPriority };
    },
  };
}
