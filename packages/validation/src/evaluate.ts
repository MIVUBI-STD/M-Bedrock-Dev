import type { TransactionValidationResult, ValidationStepResult } from "./types.js";

export function summarizeValidation(
  steps: readonly ValidationStepResult[],
): TransactionValidationResult {
  return {
    ok: steps.every((step) => step.ok),
    steps: [...steps],
  };
}
