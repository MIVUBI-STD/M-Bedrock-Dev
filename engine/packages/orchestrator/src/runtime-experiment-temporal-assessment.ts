import type {
  RuntimeTemporalAssessment,
  RuntimeTemporalRequirement,
} from "../../project-model/src/index.js";
import type {
  RuntimeExperimentTrial,
} from "../../runtime-lab/src/index.js";
import {
  assessRuntimeTemporalRequirements,
} from "./runtime-temporal-analysis.js";

export interface RuntimeExperimentTemporalAssessment {
  experimentId: string;
  trialId: string;
  armId: string;
  passed: boolean;
  assessments: readonly RuntimeTemporalAssessment[];
}

export function assessRuntimeExperimentTemporalTrials(
  experimentId: string,
  trials: readonly RuntimeExperimentTrial[],
  requirementsByArm: Readonly<
    Record<string, readonly RuntimeTemporalRequirement[]>
  >,
  continuityComplete = true,
): RuntimeExperimentTemporalAssessment[] {
  return trials
    .filter(
      (trial) =>
        trial.identity.experimentId === experimentId &&
        trial.status === "completed",
    )
    .map((trial) => {
      const requirements =
        requirementsByArm[trial.identity.armId] ?? [];
      const assessments =
        assessRuntimeTemporalRequirements(
          trial.evidence,
          requirements,
          continuityComplete,
        );

      return {
        experimentId,
        trialId: trial.id,
        armId: trial.identity.armId,
        passed:
          requirements.length > 0 &&
          assessments.length === requirements.length &&
          assessments.every(
            (assessment) =>
              assessment.status === "satisfied",
          ),
        assessments,
      };
    })
    .sort((a, b) =>
      a.armId.localeCompare(b.armId) ||
      a.trialId.localeCompare(b.trialId)
    );
}
