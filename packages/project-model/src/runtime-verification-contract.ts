import type {
  CausalControlledFactorContrast,
} from "./causal-proof.js";

export interface RuntimeVerificationExpectedContrast {
  predicateId: string;
  controlState: "present" | "absent";
  treatmentState: "present" | "absent";
}

export interface RuntimeVerificationExperimentContract {
  interventionId: string;
  experimentRevision: string;
  compatibleWithRevisions?: readonly string[];
  targetProfileFingerprint: string;
  fixtureFingerprint: string;
  predicateIds: readonly string[];
  factorContrasts: readonly CausalControlledFactorContrast[];
  expectedContrasts: readonly RuntimeVerificationExpectedContrast[];
}
