import type {
  DiagnosticExecutionContext,
} from "../../project-model/src/index.js";
import {
  planRuntimeExperimentTrials,
  type RuntimeExperimentTrialPlan,
} from "./plan.js";
import {
  validateRuntimeExperimentTrial,
} from "./validate.js";
import type {
  RuntimeExperimentDefinition,
  RuntimeExperimentTrial,
  RuntimeExperimentTrialIdentity,
} from "./types.js";

export interface RuntimeExperimentHost {
  readonly context: Extract<
    DiagnosticExecutionContext,
    "LOCAL_MINECRAFT" | "LIVE_MINECRAFT"
  >;
  readonly environmentFingerprint: string;
  executeTrial(
    definition: RuntimeExperimentDefinition,
    identity: RuntimeExperimentTrialIdentity,
  ): Promise<RuntimeExperimentTrial>;
}

const CONTEXT_RANK: Readonly<
  Record<RuntimeExperimentHost["context"], number>
> = {
  LOCAL_MINECRAFT: 0,
  LIVE_MINECRAFT: 1,
};

export interface RuntimeExperimentCampaignResult {
  plan: RuntimeExperimentTrialPlan;
  trials: readonly RuntimeExperimentTrial[];
  invalidTrialErrors: readonly string[];
}

export async function executeRuntimeExperimentCampaign(
  definition: RuntimeExperimentDefinition,
  host: RuntimeExperimentHost,
): Promise<RuntimeExperimentCampaignResult> {
  if (
    CONTEXT_RANK[host.context] <
      CONTEXT_RANK[definition.requiredContext]
  ) {
    throw new Error(
      "Runtime experiment requires " +
        definition.requiredContext +
        " but host provides " +
        host.context +
        ".",
    );
  }
  if (!host.environmentFingerprint.trim()) {
    throw new Error(
      "Runtime experiment host environmentFingerprint is required.",
    );
  }

  const plan = planRuntimeExperimentTrials(
    definition,
    host.environmentFingerprint,
  );
  const trials: RuntimeExperimentTrial[] = [];
  const invalidTrialErrors: string[] = [];

  for (const identity of plan.trials) {
    let trial: RuntimeExperimentTrial;
    try {
      trial = await host.executeTrial(definition, identity);
    } catch (error) {
      trial = {
        schemaVersion: 1,
        id:
          definition.id +
          ":" +
          identity.armId +
          ":" +
          identity.runIndex,
        identity,
        status: "failed",
        evidence: [],
        error:
          error instanceof Error
            ? error.message
            : String(error),
      };
    }

    const errors = validateRuntimeExperimentTrial(
      definition,
      trial,
    );
    if (errors.length > 0) {
      invalidTrialErrors.push(
        ...errors.map(
          (error) => trial.id + ": " + error,
        ),
      );
    }
    trials.push(trial);
  }

  return {
    plan,
    trials,
    invalidTrialErrors,
  };
}
