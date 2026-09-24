import type { DiagnosticFinding } from "../../diagnostics/src/types.js";
import type { ValidationCase, ValidationStrategy } from "../../knowledge/src/index.js";
import type { CausalIncident } from "../../project-model/src/causal-chain.js";
import type {
  DiagnosticExecutionContext,
  DiagnosticProbeDefinition,
} from "../../project-model/src/diagnostic-probe.js";

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

export function deriveDiagnosticProbeDefinitions(
  incident: CausalIncident,
  diagnostics: readonly DiagnosticFinding[],
  validationCases: readonly ValidationCase[] = [],
): DiagnosticProbeDefinition[] {
  const relatedIds = new Set(incident.relatedDiagnosticIds);
  const byId = new Map<string, DiagnosticProbeDefinition>();

  for (const finding of diagnostics) {
    if (!relatedIds.has(finding.id)) continue;
    const probe = evidenceGapProbe(incident, finding, validationCases);
    if (!probe) continue;
    byId.set(probe.id, probe);
  }

  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}
