import type {
  MutationTelemetryKind,
} from "../../project-model/src/index.js";
import type { RuntimeScope } from "../../project-model/src/index.js";
import type { TelemetryEmitter } from "./types.js";

export interface MutationLifecycleInput {
  operationId: string;
  mutationKind: MutationTelemetryKind;
  routeId?: string;
  scope?: RuntimeScope;
}

export interface MutationLifecycle {
  readonly state: "prepared" | "applied" | "verified";
  markApplied(input?: {
    tick?: number;
    timestamp?: string;
  }): void;
  verify(input: {
    result: "passed" | "failed";
    mechanism?: string;
    tick?: number;
    timestamp?: string;
  }): void;
  revalidateRoute(input: {
    routeId?: string;
    result: "passed" | "failed";
    tick?: number;
    timestamp?: string;
  }): void;
}

export function createMutationLifecycle(
  telemetry: TelemetryEmitter,
  input: MutationLifecycleInput,
): MutationLifecycle {
  if (!input.operationId.trim()) {
    throw new Error("operationId must be a non-empty string.");
  }

  let state: MutationLifecycle["state"] = "prepared";

  const operationScope = (): RuntimeScope => ({
    ...(input.scope ?? {}),
    operationId: input.operationId,
  });

  return {
    get state() {
      return state;
    },

    markApplied(details = {}) {
      if (state !== "prepared") {
        throw new Error(
          "Mutation apply may be recorded exactly once from prepared state.",
        );
      }

      telemetry.mutationApplied({
        mutationKind: input.mutationKind,
        ...(input.routeId === undefined
          ? {}
          : { routeId: input.routeId }),
        scope: operationScope(),
        ...(details.tick === undefined
          ? {}
          : { tick: details.tick }),
        ...(details.timestamp === undefined
          ? {}
          : { timestamp: details.timestamp }),
      });
      state = "applied";
    },

    verify(details) {
      if (state !== "applied") {
        throw new Error(
          "Mutation verification requires one prior applied observation.",
        );
      }

      telemetry.mutationVerification({
        result: details.result,
        ...(details.mechanism === undefined
          ? {}
          : { mechanism: details.mechanism }),
        scope: operationScope(),
        ...(details.tick === undefined
          ? {}
          : { tick: details.tick }),
        ...(details.timestamp === undefined
          ? {}
          : { timestamp: details.timestamp }),
      });
      state = "verified";
    },

    revalidateRoute(details) {
      if (state === "prepared") {
        throw new Error(
          "Route revalidation cannot be recorded before mutation apply.",
        );
      }

      const routeId = details.routeId ?? input.routeId;
      if (!routeId) {
        throw new Error(
          "Route revalidation requires routeId on lifecycle or call.",
        );
      }

      telemetry.routeRevalidation({
        routeId,
        result: details.result,
        scope: operationScope(),
        ...(details.tick === undefined
          ? {}
          : { tick: details.tick }),
        ...(details.timestamp === undefined
          ? {}
          : { timestamp: details.timestamp }),
      });
    },
  };
}
