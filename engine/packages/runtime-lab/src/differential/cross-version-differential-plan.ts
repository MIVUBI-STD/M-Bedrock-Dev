import type {
  RuntimeExperimentDefinition,
  RuntimeExperimentQualification,
  RuntimeExperimentTrial,
} from "../core/types.js";

export interface DifferentialTargetProfile {
  profileFingerprint: string;
  edition: string;
  version: string;
  host: string;
}

export interface CrossVersionDifferentialPlan {
  schemaVersion: 1;
  id: string;
  experimentId: string;
  fixtureFingerprint: string;
  targets: readonly DifferentialTargetProfile[];
  requiredRunsPerArm: number;
  status: "ready" | "blocked";
  reasons: readonly string[];
}

export interface CrossVersionDifferentialExecutionCase {
  profile: DifferentialTargetProfile;
  definition: RuntimeExperimentDefinition;
  qualification: RuntimeExperimentQualification;
  trials: readonly RuntimeExperimentTrial[];
}

export interface CrossVersionDifferentialReceipt {
  schemaVersion: 1;
  planId: string;
  status: "complete" | "incomplete";
  completedProfiles: readonly string[];
  missingProfiles: readonly string[];
  reasons: readonly string[];
}

export function createCrossVersionDifferentialPlan(
  id: string,
  experimentId: string,
  fixtureFingerprint: string,
  targets: readonly DifferentialTargetProfile[],
  requiredRunsPerArm: number,
): CrossVersionDifferentialPlan {
  const reasons: string[] = [];

  if (!id.trim()) reasons.push("Plan id is required.");
  if (!experimentId.trim()) reasons.push("Experiment id is required.");
  if (!fixtureFingerprint.trim()) reasons.push("Fixture fingerprint is required.");
  if (!Number.isInteger(requiredRunsPerArm) || requiredRunsPerArm < 1) {
    reasons.push("requiredRunsPerArm must be a positive integer.");
  }

  const fingerprints = new Set(
    targets.map((item) => item.profileFingerprint),
  );
  const versions = new Set(
    targets.map((item) => item.edition + "|" + item.version + "|" + item.host),
  );

  if (targets.length < 2) {
    reasons.push("Cross-version differential requires at least two target profiles.");
  }
  if (fingerprints.size !== targets.length) {
    reasons.push("Target profile fingerprints must be unique.");
  }
  if (versions.size < 2) {
    reasons.push("Targets must differ by version, edition, or host.");
  }

  return {
    schemaVersion: 1,
    id,
    experimentId,
    fixtureFingerprint,
    targets: [...targets].sort((a, b) =>
      a.profileFingerprint.localeCompare(b.profileFingerprint)
    ),
    requiredRunsPerArm,
    status: reasons.length === 0 ? "ready" : "blocked",
    reasons,
  };
}

export function createCrossVersionDifferentialReceipt(
  plan: CrossVersionDifferentialPlan,
  cases: readonly CrossVersionDifferentialExecutionCase[],
): CrossVersionDifferentialReceipt {
  const complete = new Set<string>();
  const reasons: string[] = [];

  if (plan.status !== "ready") {
    reasons.push("Differential plan is not ready.");
  }

  for (const item of cases) {
    if (item.definition.id !== plan.experimentId) {
      reasons.push(
        "Execution case uses unexpected experiment id for profile " +
        item.profile.profileFingerprint + ".",
      );
      continue;
    }
    if (item.definition.fixtureFingerprint !== plan.fixtureFingerprint) {
      reasons.push(
        "Execution case fixture fingerprint differs for profile " +
        item.profile.profileFingerprint + ".",
      );
      continue;
    }
    if (item.definition.targetProfileFingerprint !== item.profile.profileFingerprint) {
      reasons.push(
        "Experiment definition profile binding differs for profile " +
        item.profile.profileFingerprint + ".",
      );
      continue;
    }
    if (
      item.qualification.state !== "repeatable" &&
      item.qualification.state !== "intervention-supported"
    ) {
      reasons.push(
        "Profile " + item.profile.profileFingerprint +
        " is not repeatably qualified.",
      );
      continue;
    }

    const completedRuns = Object.values(
      item.qualification.completedRunsByArm,
    );
    if (
      completedRuns.length === 0 ||
      completedRuns.some((count) => count < plan.requiredRunsPerArm)
    ) {
      reasons.push(
        "Profile " + item.profile.profileFingerprint +
        " does not meet required runs per arm.",
      );
      continue;
    }

    complete.add(item.profile.profileFingerprint);
  }

  const required = plan.targets.map((item) => item.profileFingerprint);
  const missingProfiles = required
    .filter((fingerprint) => !complete.has(fingerprint))
    .sort();

  return {
    schemaVersion: 1,
    planId: plan.id,
    status:
      plan.status === "ready" &&
      missingProfiles.length === 0
        ? "complete"
        : "incomplete",
    completedProfiles: [...complete].sort(),
    missingProfiles,
    reasons,
  };
}
