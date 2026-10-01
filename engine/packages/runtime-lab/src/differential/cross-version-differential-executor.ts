import {
  createCrossVersionDifferentialReceipt,
  type CrossVersionDifferentialExecutionCase,
  type CrossVersionDifferentialPlan,
  type CrossVersionDifferentialReceipt,
  type DifferentialTargetProfile,
} from "./cross-version-differential-plan.js";
import {
  executeRuntimeExperimentCampaign,
  type RuntimeExperimentHost,
} from "../experiment/runner.js";
import {
  qualifyRuntimeExperiment,
} from "../experiment/qualify.js";
import type {
  RuntimeExperimentDefinition,
} from "../core/types.js";

export interface CrossVersionRuntimeTarget {
  profile: DifferentialTargetProfile;
  definition: RuntimeExperimentDefinition;
  host: RuntimeExperimentHost;
}

export interface CrossVersionDifferentialExecutionResult {
  plan: CrossVersionDifferentialPlan;
  cases: readonly CrossVersionDifferentialExecutionCase[];
  receipt: CrossVersionDifferentialReceipt;
  executionErrors: readonly string[];
}

export async function executeCrossVersionDifferentialPlan(
  plan: CrossVersionDifferentialPlan,
  targets: readonly CrossVersionRuntimeTarget[],
): Promise<CrossVersionDifferentialExecutionResult> {
  const executionErrors: string[] = [];
  const targetByFingerprint = new Map(
    targets.map((item) => [
      item.profile.profileFingerprint,
      item,
    ]),
  );
  const cases: CrossVersionDifferentialExecutionCase[] = [];

  if (plan.status !== "ready") {
    return {
      plan,
      cases,
      receipt:
        createCrossVersionDifferentialReceipt(
          plan,
          cases,
        ),
      executionErrors: [
        "Cross-version differential plan is not ready.",
        ...plan.reasons,
      ],
    };
  }

  for (const expected of plan.targets) {
    const target =
      targetByFingerprint.get(
        expected.profileFingerprint,
      );

    if (!target) {
      executionErrors.push(
        "Missing runtime host/definition for profile " +
          expected.profileFingerprint +
          ".",
      );
      continue;
    }

    if (
      target.definition.id !==
        plan.experimentId
    ) {
      executionErrors.push(
        "Profile " +
          expected.profileFingerprint +
          " uses unexpected experiment id.",
      );
      continue;
    }

    if (
      target.definition.fixtureFingerprint !==
        plan.fixtureFingerprint
    ) {
      executionErrors.push(
        "Profile " +
          expected.profileFingerprint +
          " uses unexpected fixture fingerprint.",
      );
      continue;
    }

    if (
      target.definition.targetProfileFingerprint !==
        expected.profileFingerprint
    ) {
      executionErrors.push(
        "Profile " +
          expected.profileFingerprint +
          " definition is bound to another runtime profile.",
      );
      continue;
    }

    let campaign;
    try {
      campaign =
        await executeRuntimeExperimentCampaign(
          target.definition,
          target.host,
        );
    } catch (error) {
      executionErrors.push(
        "Profile " +
          expected.profileFingerprint +
          " execution failed: " +
          (
            error instanceof Error
              ? error.message
              : String(error)
          ),
      );
      continue;
    }

    if (
      campaign.invalidTrialErrors.length >
      0
    ) {
      executionErrors.push(
        ...campaign.invalidTrialErrors.map(
          (error) =>
            "Profile " +
            expected.profileFingerprint +
            ": " +
            error,
        ),
      );
    }

    const qualification =
      qualifyRuntimeExperiment(
        target.definition,
        campaign.trials,
      );

    cases.push({
      profile: target.profile,
      definition: target.definition,
      qualification,
      trials: campaign.trials,
    });
  }

  const receipt =
    createCrossVersionDifferentialReceipt(
      plan,
      cases,
    );

  return {
    plan,
    cases: cases.sort((a, b) =>
      a.profile.profileFingerprint.localeCompare(
        b.profile.profileFingerprint,
      ),
    ),
    receipt,
    executionErrors:
      [...new Set(executionErrors)].sort(),
  };
}
