import type {
  SourceRef,
} from "../../project-model/src/index.js";
import type {
  DiagnosticCode,
} from "../../diagnostics/src/index.js";
import type {
  ValidationProofLevel,
  ValidationScenario,
  ValidationStep,
} from "./types.js";

export interface DefectRegressionContract {
  id: string;
  title: string;
  brokenInvariantIds: readonly string[];
  diagnosticCode?: DiagnosticCode;
  primarySource?: SourceRef;
  topologySensitive?: boolean;
  requiredProofLevel?: ValidationProofLevel;
}

export function validationScenarioForDefect(
  contract: DefectRegressionContract,
): ValidationScenario {
  const steps: ValidationStep[] = [];

  if (contract.primarySource) {
    steps.push({
      kind: "reparse",
      source: contract.primarySource,
    });
  }

  steps.push({
    kind: "rebuild-graph",
  });

  if (contract.diagnosticCode) {
    steps.push({
      kind: "rerun-diagnostic",
      code: contract.diagnosticCode,
      ...(contract.primarySource
        ? { source: contract.primarySource }
        : {}),
      expectation: "absent",
    });
  }

  if (
    contract.topologySensitive &&
    contract.primarySource
  ) {
    steps.push({
      kind: "topology-compare",
      source: contract.primarySource,
      expectation: "outlier-absent",
    });
  }

  return {
    schemaVersion: 1,
    id:
      "regression:" +
      contract.id,
    revision: "1",
    title:
      "Regression: " +
      contract.title,
    description:
      "Generated from a confirmed defect contract. Re-run after repair and retain evidence IDs for the repaired invariants.",
    intentInvariantIds: [
      ...new Set(
        contract.brokenInvariantIds,
      ),
    ].sort(),
    steps,
    requiredProofLevel:
      contract.requiredProofLevel ??
      "PACKAGE VERIFIED",
  };
}
