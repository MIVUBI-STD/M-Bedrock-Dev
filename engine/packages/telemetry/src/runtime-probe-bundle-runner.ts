import type {
  RuntimeProbeRequestBundle,
  RuntimeProbeResponse,
  RuntimeProbeTranscript,
} from "../../project-model/src/index.js";
import { parseRuntimeProbeRequestBundle } from "../../project-model/src/index.js";
import type { RuntimeProbeExecutor } from "./runtime-probe-executor.js";
import { createRuntimeProbeSession } from "./runtime-probe-session.js";

export interface RuntimeProbeBundleRunOptions {
  executor: RuntimeProbeExecutor;
  expectedArtifactId?: string;
  expectedSessionId?: string;
  maxExchanges?: number;
}

export interface RuntimeProbeBundleRunResult {
  responses: readonly RuntimeProbeResponse[];
  transcript: RuntimeProbeTranscript;
}

export function executeRuntimeProbeBundle(
  rawBundle: RuntimeProbeRequestBundle,
  options: RuntimeProbeBundleRunOptions,
): RuntimeProbeBundleRunResult {
  const bundle = parseRuntimeProbeRequestBundle(rawBundle);

  if (
    options.expectedArtifactId !== undefined &&
    bundle.artifactId !== options.expectedArtifactId
  ) {
    throw new Error(
      "Runtime probe bundle artifactId " +
      bundle.artifactId +
      " does not match expected artifact " +
      options.expectedArtifactId +
      ".",
    );
  }

  if (
    options.expectedSessionId !== undefined &&
    bundle.sessionId !== options.expectedSessionId
  ) {
    throw new Error(
      "Runtime probe bundle sessionId " +
      bundle.sessionId +
      " does not match expected session " +
      options.expectedSessionId +
      ".",
    );
  }

  const session = createRuntimeProbeSession({
    executor: options.executor,
    maxExchanges:
      options.maxExchanges ??
      Math.max(1, bundle.requests.length),
    ...(bundle.sessionId === undefined
      ? {}
      : { sessionId: bundle.sessionId }),
    ...(bundle.artifactId === undefined
      ? {}
      : { artifactId: bundle.artifactId }),
  });

  const responses: RuntimeProbeResponse[] = [];
  for (const request of bundle.requests) {
    responses.push(session.execute(request));
  }

  return {
    responses,
    transcript: session.snapshot(),
  };
}
