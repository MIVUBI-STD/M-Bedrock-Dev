import {
  parseTelemetryBatch,
  validateTelemetryEvent,
} from "../../project-model/src/telemetry-validate.js";
import type {
  TelemetryBatch,
  TelemetryEvent,
} from "../../project-model/src/telemetry.js";

export interface TelemetryTextParseOptions {
  linePrefix?: string;
  sessionId?: string;
  artifactId?: string;
}

function parseJson(value: string): unknown {
  return JSON.parse(value) as unknown;
}

export function parseTelemetryText(
  text: string,
  options: TelemetryTextParseOptions = {},
): TelemetryBatch {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      schemaVersion: 1,
      ...(options.sessionId === undefined
        ? {}
        : { sessionId: options.sessionId }),
      ...(options.artifactId === undefined
        ? {}
        : { artifactId: options.artifactId }),
      events: [],
    };
  }

  try {
    return parseTelemetryBatch(parseJson(trimmed));
  } catch {
    // Fall through to JSONL parsing.
  }

  const events: TelemetryEvent[] = [];
  const errors: string[] = [];
  const seenIds = new Set<string>();

  for (const [index, rawLine] of text.split(/\r?\n/).entries()) {
    let line = rawLine.trim();
    if (!line) continue;

    if (options.linePrefix && line.startsWith(options.linePrefix)) {
      line = line.slice(options.linePrefix.length).trim();
    }

    // Allow surrounding log noise by extracting the first JSON object start.
    if (!line.startsWith("{")) {
      const jsonStart = line.indexOf("{");
      if (jsonStart >= 0) line = line.slice(jsonStart);
    }

    let parsed: unknown;
    try {
      parsed = parseJson(line);
    } catch {
      errors.push("Telemetry JSONL line " + (index + 1) + " is not valid JSON.");
      continue;
    }

    const eventErrors = validateTelemetryEvent(parsed, index);
    if (eventErrors.length > 0) {
      errors.push(...eventErrors);
      continue;
    }

    const event = parsed as TelemetryEvent;
    if (seenIds.has(event.eventId)) {
      errors.push("Duplicate telemetry eventId: " + event.eventId);
      continue;
    }
    seenIds.add(event.eventId);
    events.push(event);
  }

  if (errors.length > 0) {
    throw new Error("Invalid telemetry text: " + errors.join("; "));
  }

  return {
    schemaVersion: 1,
    ...(options.sessionId === undefined
      ? {}
      : { sessionId: options.sessionId }),
    ...(options.artifactId === undefined
      ? {}
      : { artifactId: options.artifactId }),
    events,
  };
}
