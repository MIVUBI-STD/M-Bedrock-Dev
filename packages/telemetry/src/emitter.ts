import type {
  TelemetryEvent,
  TelemetryEventBase,
} from "../../project-model/src/telemetry.js";
import type { RuntimeScope } from "../../project-model/src/runtime-evidence.js";
import type {
  TelemetryEmitter,
  TelemetryEmitterOptions,
  TelemetryEventInput,
  TelemetryIdFactory,
  TelemetryScopeLease,
} from "./types.js";

function mergeScope(
  ...scopes: Array<RuntimeScope | undefined>
): RuntimeScope {
  return Object.assign({}, ...scopes.filter(Boolean));
}

export function createCounterTelemetryIdFactory(
  prefix = "telemetry",
): TelemetryIdFactory {
  let counter = 0;
  return {
    next(kind) {
      counter += 1;
      return prefix + ":" + kind + ":" + counter;
    },
  };
}

export function createTelemetryScopeLease(
  initial: RuntimeScope = {},
): TelemetryScopeLease {
  let scope: RuntimeScope = { ...initial };
  return {
    current: () => ({ ...scope }),
    replace(next) {
      scope = { ...next };
    },
    patch(next) {
      scope = { ...scope, ...next };
    },
    clear() {
      scope = {};
    },
  };
}

type Kind = TelemetryEvent["kind"];
type EventFor<K extends Kind> = Extract<TelemetryEvent, { kind: K }>;

function buildEvent<K extends Kind>(
  kind: K,
  input: TelemetryEventInput<EventFor<K>>,
  options: TelemetryEmitterOptions,
  idFactory: TelemetryIdFactory,
): EventFor<K> {
  const scope = mergeScope(
    options.baseScope,
    options.scopeProvider?.(),
    input.scope,
  );

  const { scope: _scope, ...rest } = input;
  return {
    schemaVersion: 1,
    eventId: idFactory.next(kind),
    kind,
    producer: options.producer,
    scope,
    ...rest,
  } as EventFor<K>;
}

export function createTelemetryEmitter(
  options: TelemetryEmitterOptions,
): TelemetryEmitter {
  const idFactory =
    options.idFactory ?? createCounterTelemetryIdFactory(options.producer);

  const emitBuilt = <K extends Kind>(
    kind: K,
    input: TelemetryEventInput<EventFor<K>>,
  ): EventFor<K> => {
    const event = buildEvent(kind, input, options, idFactory);
    options.sink.emit(event);
    return event;
  };

  return {
    emit(event) {
      options.sink.emit(event);
      return event;
    },
    entityStall: (input) => emitBuilt("entity-stall", input),
    teleportFallback: (input) => emitBuilt("teleport-fallback", input),
    arenaDoubleStart: (input) => emitBuilt("arena-double-start", input),
    staleCallback: (input) => emitBuilt("stale-callback", input),
    reviveAnomaly: (input) => emitBuilt("revive-anomaly", input),
    stateDrift: (input) => emitBuilt("state-drift", input),
    routeRevalidation: (input) => emitBuilt("route-revalidation", input),
    mutationVerification: (input) => emitBuilt("mutation-verification", input),
  };
}
