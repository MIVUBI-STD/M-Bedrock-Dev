import { validateTelemetryEvent } from "../../project-model/src/telemetry-validate.js";
import type { TelemetryEvent } from "../../project-model/src/telemetry.js";
import type { TelemetrySink } from "./types.js";

export interface BedrockSystemTelemetryLike {
  readonly currentTick: number;
  sendScriptEvent(id: string, message: string): void;
}

export interface BedrockConsoleLike {
  log?(message?: unknown): void;
  warn?(message?: unknown): void;
}

export function createBedrockTickProvider(
  system: Pick<BedrockSystemTelemetryLike, "currentTick">,
): () => number {
  return () => system.currentTick;
}

export function createBedrockScriptEventTelemetrySink(
  system: Pick<BedrockSystemTelemetryLike, "sendScriptEvent">,
  eventId = "mivubi:telemetry",
  maxMessageLength = 2048,
): TelemetrySink {
  if (!eventId.includes(":")) {
    throw new Error(
      "Script event id must be namespaced, for example mivubi:telemetry.",
    );
  }

  if (!Number.isInteger(maxMessageLength) || maxMessageLength < 1) {
    throw new Error("maxMessageLength must be a positive integer.");
  }

  return {
    emit(event) {
      const message = JSON.stringify(event);
      if (message.length > maxMessageLength) {
        throw new Error(
          "Telemetry event exceeds script-event payload limit: " +
          message.length +
          " > " +
          maxMessageLength +
          ".",
        );
      }
      system.sendScriptEvent(eventId, message);
    },
  };
}

export function createBedrockConsoleTelemetrySink(
  consoleLike: BedrockConsoleLike,
  prefix = "[M-Bedrock-Dev telemetry] ",
): TelemetrySink {
  const write = consoleLike.warn ?? consoleLike.log;
  if (!write) {
    throw new Error("Console sink requires warn() or log().");
  }

  return {
    emit(event) {
      write.call(consoleLike, prefix + JSON.stringify(event));
    },
  };
}


export interface BedrockScriptEventMessageLike {
  readonly id: string;
  readonly message: string;
  readonly sourceType?: unknown;
  readonly initiator?: unknown;
  readonly sourceEntity?: unknown;
  readonly sourceBlock?: unknown;
}

export interface BedrockScriptEventSignalLike {
  subscribe(
    callback: (event: BedrockScriptEventMessageLike) => void,
  ): unknown;
  unsubscribe?(
    callback: (event: BedrockScriptEventMessageLike) => void,
  ): void;
}

export interface BedrockScriptEventCollector {
  dispose(): void;
}

export interface BedrockScriptEventCollectorOptions {
  signal: BedrockScriptEventSignalLike;
  sink: TelemetrySink;
  eventId?: string;
  accept?: (event: BedrockScriptEventMessageLike) => boolean;
  onInvalid?: (
    error: Error,
    event: BedrockScriptEventMessageLike,
  ) => void;
}

export function createBedrockScriptEventTelemetryCollector(
  options: BedrockScriptEventCollectorOptions,
): BedrockScriptEventCollector {
  const eventId = options.eventId ?? "mivubi:telemetry";
  if (!eventId.includes(":")) {
    throw new Error(
      "Collector script event id must be namespaced, for example mivubi:telemetry.",
    );
  }

  const callback = (message: BedrockScriptEventMessageLike): void => {
    if (message.id !== eventId) return;
    if (options.accept && !options.accept(message)) return;

    try {
      const parsed = JSON.parse(message.message) as unknown;
      const errors = validateTelemetryEvent(parsed);
      if (errors.length > 0) {
        throw new Error(errors.join("; "));
      }
      options.sink.emit(parsed as TelemetryEvent);
    } catch (error) {
      const normalized = error instanceof Error
        ? error
        : new Error(String(error));
      if (options.onInvalid) {
        options.onInvalid(normalized, message);
        return;
      }
      throw normalized;
    }
  };

  options.signal.subscribe(callback);

  return {
    dispose() {
      options.signal.unsubscribe?.(callback);
    },
  };
}
