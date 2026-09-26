import {
  runtimeExperimentDefinitionRevision,
} from "./revision.js";
import {
  validateRuntimeExperimentDefinition,
} from "./validate.js";
import type {
  RuntimeExperimentDefinition,
  RuntimeExperimentTrialIdentity,
} from "./types.js";

export interface RuntimeExperimentTrialPlan {
  schemaVersion: 1;
  experimentId: string;
  requiredContext: RuntimeExperimentDefinition["requiredContext"];
  trials: readonly RuntimeExperimentTrialIdentity[];
}

export function planRuntimeExperimentTrials(
  definition: RuntimeExperimentDefinition,
  environmentFingerprint: string,
): RuntimeExperimentTrialPlan {
  const errors = validateRuntimeExperimentDefinition(definition);
  if (errors.length > 0) {
    throw new Error(
      "Invalid runtime experiment definition: " + errors.join("; "),
    );
  }
  if (!environmentFingerprint.trim()) {
    throw new Error("Runtime experiment environmentFingerprint is required.");
  }

  const definitionRevision =
    runtimeExperimentDefinitionRevision(definition);
  const trials: RuntimeExperimentTrialIdentity[] = [];
  for (const arm of [...definition.arms].sort((a, b) =>
    a.id.localeCompare(b.id)
  )) {
    for (
      let runIndex = 0;
      runIndex < definition.minimumRunsPerArm;
      runIndex += 1
    ) {
      trials.push({
        experimentId: definition.id,
        definitionRevision,
        armId: arm.id,
        runIndex,
        targetProfileFingerprint:
          definition.targetProfileFingerprint,
        fixtureFingerprint: definition.fixtureFingerprint,
        environmentFingerprint,
      });
    }
  }

  return {
    schemaVersion: 1,
    experimentId: definition.id,
    requiredContext: definition.requiredContext,
    trials,
  };
}
