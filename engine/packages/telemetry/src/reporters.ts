import type { RuntimeScope } from "../../project-model/src/index.js";
import type { TelemetryEmitter } from "./types.js";

export interface VerificationObservation {
  result: "passed" | "failed";
  scope?: RuntimeScope;
  tick?: number;
  timestamp?: string;
}

export interface RouteVerificationObservation extends VerificationObservation {
  routeId: string;
}

export interface MutationVerificationObservation extends VerificationObservation {
  mechanism?: string;
}

export interface VerificationReporter {
  route(input: RouteVerificationObservation): void;
  mutation(input: MutationVerificationObservation): void;
}

export function createVerificationReporter(
  telemetry: TelemetryEmitter,
): VerificationReporter {
  return {
    route(input) {
      telemetry.routeRevalidation({
        routeId: input.routeId,
        result: input.result,
        ...(input.scope === undefined ? {} : { scope: input.scope }),
        ...(input.tick === undefined ? {} : { tick: input.tick }),
        ...(input.timestamp === undefined
          ? {}
          : { timestamp: input.timestamp }),
      });
    },

    mutation(input) {
      telemetry.mutationVerification({
        result: input.result,
        ...(input.mechanism === undefined
          ? {}
          : { mechanism: input.mechanism }),
        ...(input.scope === undefined ? {} : { scope: input.scope }),
        ...(input.tick === undefined ? {} : { tick: input.tick }),
        ...(input.timestamp === undefined
          ? {}
          : { timestamp: input.timestamp }),
      });
    },
  };
}
