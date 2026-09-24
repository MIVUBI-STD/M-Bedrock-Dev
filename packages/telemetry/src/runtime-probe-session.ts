import type {
  RuntimeProbeRequest,
  RuntimeProbeResponse,
  RuntimeProbeTranscript,
} from "../../project-model/src/runtime-probe.js";
import { parseRuntimeProbeExchange } from "../../project-model/src/runtime-probe-validate.js";
import type { RuntimeProbeExecutor } from "./runtime-probe-executor.js";

export interface RuntimeProbeSessionOptions {
  executor: RuntimeProbeExecutor;
  maxExchanges?: number;
  sessionId?: string;
  artifactId?: string;
}

export interface RuntimeProbeSession {
  readonly size: number;
  readonly dropped: number;
  execute(request: RuntimeProbeRequest): RuntimeProbeResponse;
  snapshot(): RuntimeProbeTranscript;
  drainTranscript(): RuntimeProbeTranscript;
  clear(): void;
}

export function createRuntimeProbeSession(
  options: RuntimeProbeSessionOptions,
): RuntimeProbeSession {
  const maxExchanges = options.maxExchanges ?? 256;
  if (!Number.isInteger(maxExchanges) || maxExchanges < 1) {
    throw new Error("maxExchanges must be a positive integer.");
  }

  const exchanges: Array<{
    request: RuntimeProbeRequest;
    response: RuntimeProbeResponse;
  }> = [];
  const requestIds = new Set<string>();
  let dropped = 0;

  const transcript = (): RuntimeProbeTranscript => ({
    schemaVersion: 1,
    ...(options.sessionId === undefined
      ? {}
      : { sessionId: options.sessionId }),
    ...(options.artifactId === undefined
      ? {}
      : { artifactId: options.artifactId }),
    ...(dropped === 0 ? {} : { droppedExchanges: dropped }),
    exchanges: exchanges.map((item) => ({
      request: item.request,
      response: item.response,
    })),
  });

  return {
    get size() {
      return exchanges.length;
    },

    get dropped() {
      return dropped;
    },

    execute(request) {
      if (requestIds.has(request.requestId)) {
        throw new Error(
          "Duplicate runtime probe requestId in session: " +
          request.requestId,
        );
      }

      const response = options.executor.execute(request);
      const exchange = parseRuntimeProbeExchange(request, response);
      requestIds.add(request.requestId);
      exchanges.push(exchange);

      if (exchanges.length > maxExchanges) {
        const overflow = exchanges.length - maxExchanges;
        exchanges.splice(0, overflow);
        dropped += overflow;
      }

      return response;
    },

    snapshot() {
      return transcript();
    },

    drainTranscript() {
      const output = transcript();
      exchanges.length = 0;
      dropped = 0;
      return output;
    },

    clear() {
      exchanges.length = 0;
      requestIds.clear();
      dropped = 0;
    },
  };
}
