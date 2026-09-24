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
): TelemetrySink {
  if (!eventId.includes(":")) {
    throw new Error(
      "Script event id must be namespaced, for example mivubi:telemetry.",
    );
  }

  return {
    emit(event) {
      system.sendScriptEvent(eventId, JSON.stringify(event));
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
