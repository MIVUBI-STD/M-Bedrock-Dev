import type {
  DiagnosticProbeDefinition,
  RuntimeProbeBinding,
  RuntimeProbeRequestBundle,
} from "../../../project-model/src/index.js";
import type {
  CrossDomainHypothesisAssessment,
  DiagnosticProbeCandidate,
} from "../../../diagnostic-reasoning/src/index.js";
import {
  compileMinimalCrossDomainRuntimeProbes,
} from "./cross-domain-runtime-probe-compiler.js";

export interface CrossDomainRuntimeHandoff {
  bundle: RuntimeProbeRequestBundle;
  selectedProbeIds: readonly string[];
  issues: ReturnType<
    typeof compileMinimalCrossDomainRuntimeProbes
  >["issues"];
}

export function prepareCrossDomainRuntimeHandoff(input: {
  incidentId: string;
  artifactId: string;
  sessionId?: string;
  assessments: readonly CrossDomainHypothesisAssessment[];
  candidates: readonly DiagnosticProbeCandidate[];
  definitions: readonly DiagnosticProbeDefinition[];
  bindings: readonly RuntimeProbeBinding[];
  maxRequests?: number;
}): CrossDomainRuntimeHandoff {
  const compiled = compileMinimalCrossDomainRuntimeProbes(
    input.incidentId,
    input.assessments,
    input.candidates,
    input.definitions,
    input.bindings,
    {
      ...(input.maxRequests === undefined
        ? {}
        : { maxRequests: input.maxRequests }),
    },
  );

  return {
    bundle: {
      schemaVersion: 1,
      artifactId: input.artifactId,
      ...(input.sessionId === undefined
        ? {}
        : { sessionId: input.sessionId }),
      ...(compiled.requests.length === 0
        ? {}
        : { incidentIds: [input.incidentId] }),
      requests: compiled.requests,
    },
    selectedProbeIds: compiled.plan.recommended
      .map((item) => item.probeId),
    issues: compiled.issues,
  };
}
