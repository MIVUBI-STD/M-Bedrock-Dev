import {
  assessCrossDomainHypotheses,
  planMinimalCrossDomainProbes,
  projectFindingClassification,
  type DiagnosticProbeCandidate,
  type IntentDiagnosticDisposition,
} from "../../../diagnostic-reasoning/src/index.js";
import type {
  RuntimeProbeTranscript,
} from "../../../project-model/src/index.js";
import type {
  GameplayDefectResolution,
} from "../inspection/gameplay-defect-resolution.js";
import type {
  GameplayScenarioGraph,
} from "../inspection/gameplay-scenario-model.js";
import type {
  AuditIssueProjection,
} from "../map-audit-issue-projection.js";
import {
  constructCausalLinkHypothesis,
} from "./causal-link-hypothesis-construction.js";
import {
  constructCausalLinkEvidence,
} from "./causal-link-evidence-construction.js";
import {
  admitMapAuditFindingReasoning,
} from "../reporting/map-audit-finding-reasoning-admission.js";

export type CausalLinkReasoningStatus =
  | "ADMITTED"
  | "REJECTED"
  | "NOT_CONSTRUCTIBLE";

export interface CausalLinkReasoningReceipt {
  causalLinkId: string;
  status: CausalLinkReasoningStatus;
  hypothesisSetId?: string;
  hypothesisId?: string;
  reportClassification?: string;
  proofConfidence?: string;
  nextPredicate?: string;
  recommendedReadOnlyProbeId?: string;
  evidenceIds: readonly string[];
  rejectionReasons: readonly string[];
  reasoning?: ReturnType<
    typeof admitMapAuditFindingReasoning
  >["admitted"][string];
}

export function reasonAboutCausalLinkFinding(input: {
  graph: GameplayScenarioGraph;
  resolution: GameplayDefectResolution;
  finding: AuditIssueProjection;
  diagnosticDisposition: IntentDiagnosticDisposition;
  runtimeProbeTranscript?: RuntimeProbeTranscript;
  probeCandidates?: readonly DiagnosticProbeCandidate[];
  expectedArtifactId?: string;
}): CausalLinkReasoningReceipt {
  const construction = constructCausalLinkHypothesis({
    graph: input.graph,
    resolution: input.resolution,
  });
  if (!construction) {
    return {
      causalLinkId: input.resolution.causalLinkId,
      status: "NOT_CONSTRUCTIBLE",
      evidenceIds: [],
      rejectionReasons: [
        "Canonical causal-link hypothesis could not be constructed.",
      ],
    };
  }

  const evidence = constructCausalLinkEvidence({
    graph: input.graph,
    resolution: input.resolution,
    construction,
    ...(input.runtimeProbeTranscript
      ? { runtimeProbeTranscript: input.runtimeProbeTranscript }
      : {}),
    ...(input.expectedArtifactId
      ? { expectedArtifactId: input.expectedArtifactId }
      : {}),
  });
  const assessment = assessCrossDomainHypotheses(
    construction.hypothesisSet,
    evidence,
  )[0];

  if (!assessment) {
    return {
      causalLinkId: construction.causalLinkId,
      status: "NOT_CONSTRUCTIBLE",
      hypothesisSetId: construction.hypothesisSet.id,
      evidenceIds: evidence.flatMap((item) =>
        item.evidenceId ? [item.evidenceId] : []
      ),
      rejectionReasons: [
        "Canonical hypothesis set produced no assessment.",
      ],
    };
  }

  const projection = projectFindingClassification(
    input.diagnosticDisposition,
    assessment,
  );
  const probe = planMinimalCrossDomainProbes(
    [assessment],
    input.probeCandidates ?? [],
  )[0];

  const admission = admitMapAuditFindingReasoning(
    [input.finding],
    [{
      causalLinkId: construction.causalLinkId,
      projection,
      assessment,
      ...(probe ? { probe } : {}),
    }],
  );
  const reasoning =
    admission.admitted[construction.causalLinkId];
  const rejected =
    admission.rejected.find(
      (item) =>
        item.causalLinkId === construction.causalLinkId,
    );

  return {
    causalLinkId: construction.causalLinkId,
    status: reasoning ? "ADMITTED" : "REJECTED",
    hypothesisSetId: construction.hypothesisSet.id,
    hypothesisId: assessment.hypothesisId,
    reportClassification: projection.reportClassification,
    proofConfidence: assessment.confidence,
    ...(assessment.nextPredicate
      ? { nextPredicate: assessment.nextPredicate }
      : {}),
    ...(probe?.probeId
      ? { recommendedReadOnlyProbeId: probe.probeId }
      : {}),
    evidenceIds: evidence.flatMap((item) =>
      item.evidenceId ? [item.evidenceId] : []
    ).filter((value, index, all) =>
      all.indexOf(value) === index
    ).sort(),
    rejectionReasons: rejected?.reasons ?? [],
    ...(reasoning ? { reasoning } : {}),
  };
}
