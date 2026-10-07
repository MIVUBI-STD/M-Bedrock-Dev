import type {
  CrossDomainEvidenceObservation,
} from "../../../diagnostic-reasoning/src/index.js";
import type {
  RuntimeProbeTranscript,
} from "../../../project-model/src/index.js";
import type {
  CausalLinkHypothesisConstruction,
} from "./causal-link-hypothesis-construction.js";
import type {
  GameplayDefectResolution,
} from "../inspection/gameplay-defect-resolution.js";
import type {
  GameplayScenarioGraph,
} from "../inspection/gameplay-scenario-model.js";

function evidenceId(prefix: string, ids: readonly string[]): string {
  return prefix + ":" + ids.slice().sort().join("+");
}

export function constructCausalLinkEvidence(input: {
  graph: GameplayScenarioGraph;
  resolution: GameplayDefectResolution;
  construction: CausalLinkHypothesisConstruction;
  runtimeProbeTranscript?: RuntimeProbeTranscript;
}): CrossDomainEvidenceObservation[] {
  const link = input.graph.causalLinks.find(
    (item) => item.id === input.construction.causalLinkId,
  );
  if (!link) return [];

  const output: CrossDomainEvidenceObservation[] = [];
  const contradictionPredicate =
    "causal-link:" + link.id + ":contradiction:none";
  output.push({
    predicate: contradictionPredicate,
    state: link.status === "CONTRADICTED"
      ? "present"
      : link.status === "PROVEN"
        ? "absent"
        : "unknown",
    evidenceId: evidenceId(
      "causal-link",
      link.evidenceIds.length > 0 ? link.evidenceIds : [link.id],
    ),
    domain: "static",
  });

  if (link.knowledgeRequirementId) {
    const receipt = input.graph.knowledgeReceipts.find(
      (item) => item.requirementId === link.knowledgeRequirementId,
    );
    const predicate =
      "causal-link:" + link.id + ":knowledge:" +
      link.knowledgeRequirementId;
    output.push({
      predicate,
      state:
        receipt?.status === "SATISFIED"
          ? "present"
          : receipt === undefined
            ? "unknown"
            : "absent",
      evidenceId: evidenceId(
        "knowledge-receipt",
        receipt?.evidenceIds.length
          ? receipt.evidenceIds
          : [link.knowledgeRequirementId],
      ),
      domain: "knowledge",
    });
  }

  const counterProofIds = [
    ...(input.resolution.counterProofEvidenceIds ?? []),
    ...(input.resolution.counterProofSearch?.conclusion === "BLOCKING_PROOF_FOUND"
      ? input.resolution.counterProofSearch.evidenceIds
      : []),
  ].filter((value, index, all) => all.indexOf(value) === index);

  output.push({
    predicate: "causal-link:" + link.id + ":counterproof:none",
    state: counterProofIds.length > 0 ? "present" : "absent",
    evidenceId: evidenceId(
      "counterproof",
      counterProofIds.length > 0 ? counterProofIds : [link.id],
    ),
    domain: "static",
  });

  const runtimePredicate =
    "causal-link:" + link.id + ":runtime:none";
  if (
    input.construction.requiredPredicateIds.includes(runtimePredicate)
  ) {
    const exchanges =
      input.runtimeProbeTranscript?.exchanges.filter(
        (exchange) =>
          exchange.request.incidentId === link.id &&
          exchange.request.predicate === runtimePredicate,
      ) ?? [];
    if (exchanges.length === 0) {
      output.push({
        predicate: runtimePredicate,
        state: "unknown",
        evidenceId: "runtime-unobserved:" + link.id,
        domain: "runtime",
      });
    } else {
      const states = exchanges.map((exchange) => exchange.response.state);
      const state =
        states.includes("present")
          ? "present"
          : states.every((item) => item === "absent")
            ? "absent"
            : "unknown";
      output.push({
        predicate: runtimePredicate,
        state,
        evidenceId: evidenceId(
          "runtime-probe",
          exchanges.map((exchange) =>
            exchange.response.evidence.id
          ),
        ),
        domain: "runtime",
      });
    }
  }

  return output;
}
