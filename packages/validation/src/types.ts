import type { SourceRef } from "../../project-model/src/index.js";
import type { DiagnosticCode } from "../../diagnostics/src/index.js";

export type ValidationStep =
  | {
      kind: "reparse";
      source: SourceRef;
    }
  | {
      kind: "rebuild-graph";
    }
  | {
      kind: "rerun-diagnostic";
      code: DiagnosticCode;
      source?: SourceRef;
      expectation: "absent";
    }
  | {
      kind: "topology-compare";
      source: SourceRef;
      expectation: "outlier-absent";
    };

export interface ValidationStepResult {
  step: ValidationStep;
  ok: boolean;
  message: string;
}

export interface TransactionValidationResult {
  ok: boolean;
  steps: ValidationStepResult[];
}
