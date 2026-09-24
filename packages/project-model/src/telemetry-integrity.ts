import type {
  TelemetryBatch,
  TelemetryEvent,
} from "./telemetry.js";

export type TelemetryIntegrityIssueKind =
  | "sequence-without-stream"
  | "stream-missing-sequence"
  | "duplicate-sequence"
  | "sequence-regression"
  | "sequence-gap"
  | "dropped-events";

export interface TelemetryIntegrityIssue {
  kind: TelemetryIntegrityIssueKind;
  streamId?: string;
  eventId?: string;
  previousEventId?: string;
  sequence?: number;
  previousSequence?: number;
  gap?: number;
  explainedByDroppedEvents?: boolean;
  droppedEvents?: number;
}

export interface TelemetryIntegrityReport {
  complete: boolean;
  issues: readonly TelemetryIntegrityIssue[];
  streams: Readonly<Record<string, {
    events: number;
    firstSequence?: number;
    lastSequence?: number;
  }>>;
}

export function analyzeTelemetryIntegrity(
  batch: TelemetryBatch,
): TelemetryIntegrityReport {
  const issues: TelemetryIntegrityIssue[] = [];
  const streams = new Map<string, TelemetryEvent[]>();

  if ((batch.droppedEvents ?? 0) > 0) {
    issues.push({
      kind: "dropped-events",
      droppedEvents: batch.droppedEvents,
    });
  }

  for (const event of batch.events) {
    if (event.sequence !== undefined && event.streamId === undefined) {
      issues.push({
        kind: "sequence-without-stream",
        eventId: event.eventId,
        sequence: event.sequence,
      });
      continue;
    }

    if (event.streamId === undefined) continue;

    if (event.sequence === undefined) {
      issues.push({
        kind: "stream-missing-sequence",
        streamId: event.streamId,
        eventId: event.eventId,
      });
    }

    const list = streams.get(event.streamId) ?? [];
    list.push(event);
    streams.set(event.streamId, list);
  }

  const summary: Record<string, {
    events: number;
    firstSequence?: number;
    lastSequence?: number;
  }> = {};

  for (const [streamId, events] of streams) {
    let previous: TelemetryEvent | undefined;
    const seen = new Map<number, string>();

    for (const event of events) {
      const sequence = event.sequence;
      if (sequence === undefined) {
        previous = event;
        continue;
      }

      const duplicate = seen.get(sequence);
      if (duplicate !== undefined) {
        issues.push({
          kind: "duplicate-sequence",
          streamId,
          eventId: event.eventId,
          previousEventId: duplicate,
          sequence,
        });
      }
      seen.set(sequence, event.eventId);

      if (previous?.sequence !== undefined) {
        if (sequence < previous.sequence) {
          issues.push({
            kind: "sequence-regression",
            streamId,
            eventId: event.eventId,
            previousEventId: previous.eventId,
            sequence,
            previousSequence: previous.sequence,
          });
        } else if (sequence > previous.sequence + 1) {
          const gap = sequence - previous.sequence - 1;
          issues.push({
            kind: "sequence-gap",
            streamId,
            eventId: event.eventId,
            previousEventId: previous.eventId,
            sequence,
            previousSequence: previous.sequence,
            gap,
            explainedByDroppedEvents:
              (batch.droppedEvents ?? 0) >= gap,
          });
        }
      }

      previous = event;
    }

    const sequences = events
      .map((event) => event.sequence)
      .filter((value): value is number => value !== undefined);

    summary[streamId] = {
      events: events.length,
      ...(sequences.length === 0
        ? {}
        : {
            firstSequence: Math.min(...sequences),
            lastSequence: Math.max(...sequences),
          }),
    };
  }

  return {
    complete: issues.length === 0,
    issues,
    streams: summary,
  };
}
