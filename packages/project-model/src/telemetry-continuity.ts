import type {
  TelemetryBatch,
  TelemetryEvent,
} from "./telemetry.js";

export interface TelemetrySequenceGap {
  after: number;
  before: number;
  missing: number;
}

export interface TelemetryStreamContinuity {
  streamId: string;
  events: number;
  minSequence: number;
  maxSequence: number;
  duplicateSequences: readonly number[];
  gaps: readonly TelemetrySequenceGap[];
  nonMonotonicTransitions: number;
}

export interface TelemetryContinuityReport {
  events: number;
  sequencedEvents: number;
  unsequencedEvents: number;
  unidentifiedStreamEvents: number;
  streams: readonly TelemetryStreamContinuity[];
  missingSequences: number;
  duplicateSequences: number;
  nonMonotonicTransitions: number;
  droppedEvents: number;
  incomplete: boolean;
}

function continuityForStream(
  streamId: string,
  events: readonly TelemetryEvent[],
): TelemetryStreamContinuity {
  const sequenced = events
    .filter((event): event is TelemetryEvent & { sequence: number } =>
      typeof event.sequence === "number"
    );

  const seen = new Set<number>();
  const duplicates = new Set<number>();
  let nonMonotonicTransitions = 0;
  let previous: number | undefined;

  for (const event of sequenced) {
    if (seen.has(event.sequence)) duplicates.add(event.sequence);
    seen.add(event.sequence);

    if (previous !== undefined && event.sequence <= previous) {
      nonMonotonicTransitions += 1;
    }
    previous = event.sequence;
  }

  const sorted = [...seen].sort((a, b) => a - b);
  const gaps: TelemetrySequenceGap[] = [];
  for (let index = 1; index < sorted.length; index += 1) {
    const after = sorted[index - 1]!;
    const before = sorted[index]!;
    const missing = before - after - 1;
    if (missing > 0) gaps.push({ after, before, missing });
  }

  return {
    streamId,
    events: sequenced.length,
    minSequence: sorted[0] ?? 0,
    maxSequence: sorted.at(-1) ?? 0,
    duplicateSequences: [...duplicates].sort((a, b) => a - b),
    gaps,
    nonMonotonicTransitions,
  };
}

export function analyzeTelemetryContinuity(
  batch: TelemetryBatch,
): TelemetryContinuityReport {
  const grouped = new Map<string, TelemetryEvent[]>();
  let sequencedEvents = 0;
  let unsequencedEvents = 0;
  let unidentifiedStreamEvents = 0;

  for (const event of batch.events) {
    if (event.sequence === undefined) {
      unsequencedEvents += 1;
      continue;
    }

    sequencedEvents += 1;
    const streamId = event.streamId ?? "<unidentified>";
    if (event.streamId === undefined) unidentifiedStreamEvents += 1;
    const list = grouped.get(streamId) ?? [];
    list.push(event);
    grouped.set(streamId, list);
  }

  const streams = [...grouped.entries()]
    .map(([streamId, events]) => continuityForStream(streamId, events))
    .sort((a, b) => a.streamId.localeCompare(b.streamId));

  const missingSequences = streams.reduce(
    (sum, stream) =>
      sum + stream.gaps.reduce((inner, gap) => inner + gap.missing, 0),
    0,
  );
  const duplicateSequences = streams.reduce(
    (sum, stream) => sum + stream.duplicateSequences.length,
    0,
  );
  const nonMonotonicTransitions = streams.reduce(
    (sum, stream) => sum + stream.nonMonotonicTransitions,
    0,
  );
  const droppedEvents = batch.droppedEvents ?? 0;

  return {
    events: batch.events.length,
    sequencedEvents,
    unsequencedEvents,
    unidentifiedStreamEvents,
    streams,
    missingSequences,
    duplicateSequences,
    nonMonotonicTransitions,
    droppedEvents,
    incomplete:
      droppedEvents > 0 ||
      missingSequences > 0 ||
      duplicateSequences > 0 ||
      nonMonotonicTransitions > 0,
  };
}
