import type {
  RuntimeProbeQuery,
  RuntimeProbeRequest,
  RuntimeProbeOutcomeMap,
} from "../../project-model/src/index.js";
import type { RuntimeScope } from "../../project-model/src/index.js";

export interface ActiveRuntimeProbeTransport {
  send(request: RuntimeProbeRequest): void;
}

export interface ActiveRuntimeProbeClientOptions {
  transport: ActiveRuntimeProbeTransport;
  baseScope?: RuntimeScope;
  scopeProvider?: () => RuntimeScope | undefined;
  tickProvider?: () => number | undefined;
  requestIdFactory?: () => string;
}

export interface ActiveRuntimeProbeInput {
  probeId: string;
  predicate: string;
  query: RuntimeProbeQuery;
  outcomeByState: RuntimeProbeOutcomeMap;
  scope?: RuntimeScope;
  runtimeTick?: number;
}

export interface ActiveRuntimeProbeClient {
  request(input: ActiveRuntimeProbeInput): RuntimeProbeRequest;
}

function mergeScope(
  ...parts: Array<RuntimeScope | undefined>
): RuntimeScope | undefined {
  const values = parts.filter(
    (item): item is RuntimeScope => item !== undefined,
  );
  return values.length === 0
    ? undefined
    : Object.assign({}, ...values);
}

export function createActiveRuntimeProbeClient(
  options: ActiveRuntimeProbeClientOptions,
): ActiveRuntimeProbeClient {
  let counter = 0;

  return {
    request(input) {
      counter += 1;
      const requestId =
        options.requestIdFactory?.() ?? "runtime-probe:" + counter;
      const runtimeTick = input.runtimeTick ?? options.tickProvider?.();
      const scope = mergeScope(
        options.baseScope,
        options.scopeProvider?.(),
        input.scope,
      );

      const request: RuntimeProbeRequest = {
        schemaVersion: 1,
        requestId,
        probeId: input.probeId,
        predicate: input.predicate,
        query: input.query,
        outcomeByState: input.outcomeByState,
        ...(scope === undefined ? {} : { scope }),
        ...(runtimeTick === undefined ? {} : { runtimeTick }),
      };

      options.transport.send(request);
      return request;
    },
  };
}
