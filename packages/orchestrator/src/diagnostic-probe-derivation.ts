import type { DiagnosticFinding } from "../../diagnostics/src/index.js";
import type { ValidationCase, ValidationStrategy } from "../../knowledge/src/index.js";
import type { CausalIncident } from "../../project-model/src/index.js";
import type {
  DiagnosticExecutionContext,
  DiagnosticProbeDefinition,
} from "../../project-model/src/index.js";

function contextForStrategy(
  strategy: ValidationStrategy | undefined,
): DiagnosticExecutionContext {
  switch (strategy) {
    case "static-proof":
      return "REMOTE_GITHUB";
    case "repeatability":
      return "LOCAL_MINECRAFT";
    case "runtime-invariant":
    case "concurrency":
    case "recovery":
    case "manual-or-gametest":
    case undefined:
      return "LIVE_MINECRAFT";
  }
}

function stringData(
  finding: DiagnosticFinding,
  key: string,
): string | undefined {
  const value = finding.data?.[key];
  return typeof value === "string" ? value : undefined;
}

function candidateIdForSubject(
  incident: CausalIncident,
  subject: string,
): string | undefined {
  return incident.rootCauseCandidates.find(
    (candidate) => candidate.label === subject,
  )?.id;
}

function validationForRelation(
  cases: readonly ValidationCase[],
  relationId: string,
): ValidationCase | undefined {
  return cases.find((item) => item.relationId === relationId);
}

function evidenceGapProbe(
  incident: CausalIncident,
  finding: DiagnosticFinding,
  validationCases: readonly ValidationCase[],
): DiagnosticProbeDefinition | undefined {
  if (finding.code !== "KNOWLEDGE_EVIDENCE_GAP") return undefined;

  const relationId = stringData(finding, "relationId");
  const relationKind = stringData(finding, "relationKind");
  const subject = stringData(finding, "subject");
  const object = stringData(finding, "object");
  if (!relationId || !relationKind || !subject || !object) return undefined;

  const candidateId = candidateIdForSubject(incident, subject);
  if (!candidateId) return undefined;

  const validation = validationForRelation(validationCases, relationId);
  const requiredContext = contextForStrategy(validation?.strategy);

  if (relationKind === "requires" || relationKind === "restores") {
    return {
      id: "probe::" + relationId,
      label: "Observe required runtime state: " + object,
      requiredContext,
      costUnits: validation?.strategy === "static-proof" ? 1 : 2,
      mutationRisk: "read-only",
      rationale: validation?.objective ?? finding.message,
      outcomes: [
        {
          id: "present",
          observation: object + " is present",
          rejectsCandidateIds: [candidateId],
        },
        {
          id: "absent",
          observation: object + " is absent",
          supportsCandidateIds: [candidateId],
        },
      ],
    };
  }

  if (relationKind === "gates") {
    return {
      id: "probe::" + relationId,
      label: "Observe required gate state: " + subject,
      requiredContext,
      costUnits: validation?.strategy === "static-proof" ? 1 : 2,
      mutationRisk: "read-only",
      rationale: validation?.objective ?? finding.message,
      outcomes: [
        {
          id: "present",
          observation: subject + " gate is present",
          rejectsCandidateIds: [candidateId],
        },
        {
          id: "absent",
          observation: subject + " gate is absent",
          supportsCandidateIds: [candidateId],
        },
      ],
    };
  }

  if (relationKind === "requires-any") {
    return {
      id: "probe::" + relationId,
      label: "Observe at least one required alternative: " + object,
      requiredContext,
      costUnits: validation?.strategy === "static-proof" ? 1 : 2,
      mutationRisk: "read-only",
      rationale: validation?.objective ?? finding.message,
      outcomes: [
        {
          id: "alternative-present",
          observation: "At least one required alternative is present",
          rejectsCandidateIds: [candidateId],
        },
        {
          id: "all-alternatives-absent",
          observation: "All required alternatives are absent",
          supportsCandidateIds: [candidateId],
        },
      ],
    };
  }

  return undefined;
}

function semanticIrProbe(
  incident: CausalIncident,
  finding: DiagnosticFinding,
): DiagnosticProbeDefinition | undefined {
  if (
    finding.code !== "SEMANTIC_IR_EXECUTION_TARGET_UNRESOLVED" &&
    finding.code !== "SEMANTIC_IR_DEFERRED_STATE_GUARD_UNKNOWN"
  ) {
    return undefined;
  }

  const subject = stringData(finding, "subject");
  if (!subject) return undefined;
  const candidateId = candidateIdForSubject(incident, subject);
  if (!candidateId) return undefined;

  if (finding.code === "SEMANTIC_IR_EXECUTION_TARGET_UNRESOLVED") {
    return {
      id: "probe::semantic-ir::" + finding.id,
      label: "Resolve semantic execution target: " +
        (stringData(finding, "targetLabel") ?? subject),
      requiredContext: "LOCAL_ARTIFACT",
      costUnits: 1,
      mutationRisk: "read-only",
      rationale:
        "Resolve the execution target from source/import/function evidence before making downstream execution claims.",
      outcomes: [{
        id: "resolved",
        observation: "Execution target resolves to a unique semantic region",
        rejectsCandidateIds: [candidateId],
      }, {
        id: "still-unresolved",
        observation: "Execution target remains unresolved after bounded source resolution",
        supportsCandidateIds: [candidateId],
      }],
    };
  }

  return {
    id: "probe::semantic-ir::" + finding.id,
    label: "Observe deferred callback generation ownership",
    requiredContext: "LIVE_MINECRAFT",
    costUnits: 2,
    mutationRisk: "read-only",
    rationale:
      "Observe the callback's session/arena/subsystem generation at execution before treating stale deferred work as causal.",
    outcomes: [{
      id: "current-generation",
      observation: "Deferred callback executes under the current owning generation",
      rejectsCandidateIds: [candidateId],
    }, {
      id: "stale-or-unbound-generation",
      observation: "Deferred callback executes under a stale or unbound generation",
      supportsCandidateIds: [candidateId],
    }],
  };
}

export function deriveDiagnosticProbeDefinitions(
  incident: CausalIncident,
  diagnostics: readonly DiagnosticFinding[],
  validationCases: readonly ValidationCase[] = [],
): DiagnosticProbeDefinition[] {
  const relatedIds = new Set(incident.relatedDiagnosticIds);
  const byId = new Map<string, DiagnosticProbeDefinition>();

  for (const finding of diagnostics) {
    if (!relatedIds.has(finding.id)) continue;
    const probe =
      evidenceGapProbe(incident, finding, validationCases) ??
      semanticIrProbe(incident, finding);
    if (!probe) continue;
    byId.set(probe.id, probe);
  }

  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}
