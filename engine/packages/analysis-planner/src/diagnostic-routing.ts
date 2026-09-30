import type {
  IntentDiagnosticGateResult,
} from "../../diagnostic-reasoning/src/index.js";
import type {
  AnalysisGoal,
} from "./types.js";

export type DiagnosticAnalysisRouting =
  | {
      disposition: "complete";
      reason: string;
    }
  | {
      disposition: "analyze";
      goal: AnalysisGoal;
      reason: string;
    };

export function routeIntentDiagnosticNextAnalysis(
  diagnostic: IntentDiagnosticGateResult,
): DiagnosticAnalysisRouting {
  switch (diagnostic.nextEvidenceNeed) {
    case "none":
      return {
        disposition: "complete",
        reason:
          "Diagnostic classification is complete; no additional analysis should run automatically.",
      };

    case "runtime-proof":
      return {
        disposition: "analyze",
        goal: "runtime-behavior",
        reason:
          "Runtime semantics must be observed before classification can advance.",
      };

    case "runtime-evidence-integrity":
      return {
        disposition: "analyze",
        goal: "runtime-evidence-integrity",
        reason:
          "Conflicting or incomplete runtime evidence must be resolved before classification can advance.",
      };

    case "contradiction-proof":
      return {
        disposition: "analyze",
        goal: "contradiction-proof",
        reason:
          "A stronger contradiction proof is required before defect classification.",
      };

    case "intent-grounding":
    case "intent-clarification":
      return {
        disposition: "analyze",
        goal: "intent-classification",
        reason:
          "Gameplay intent evidence must be strengthened before defect classification can advance.",
      };

    case "authored-intent":
      return {
        disposition: "analyze",
        goal: "authored-intent",
        reason:
          "Authored gameplay intent evidence is required before a probable defect can be promoted.",
      };
  }
}
