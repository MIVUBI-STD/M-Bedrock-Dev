import type {
  IntentDiagnosticDisposition,
} from "../../../diagnostic-reasoning/src/index.js";
import type {
  GameplayDefectResolutionDisposition,
} from "../inspection/gameplay-defect-resolution.js";

export function diagnosticDispositionForDefectResolution(
  disposition: GameplayDefectResolutionDisposition,
): IntentDiagnosticDisposition {
  switch (disposition) {
    case "CONFIRMED_DEFECT_READY":
      return "confirmed-defect";
    case "BLOCKING_COUNTERPROOF":
      return "designed-behavior";
    case "RUNTIME_PROOF_REQUIRED":
      return "runtime-proof-required";
    case "DETECTION_GAP":
      return "insufficient-evidence";
    case "GAMEPLAY_TRANSLATION_REQUIRED":
      return "ambiguous-intent";
    case "COUNTERPROOF_SEARCH_REQUIRED":
      return "insufficient-evidence";
  }
}
