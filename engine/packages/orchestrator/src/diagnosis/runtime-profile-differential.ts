import type {
  DiagnosticEvidenceObservation,
} from "../../../diagnostic-reasoning/src/index.js";
import type {
  CapturedMinecraftRuntimeProfile,
} from "../../../runtime-profile/src/index.js";
import {
  runtimeExperimentDifferentialContractRevision,
  type RuntimeExperimentDefinition,
  type RuntimeExperimentQualification,
  type RuntimeExperimentTrial,
} from "../../../runtime-lab/src/index.js";
import {
  runtimeExperimentDiagnosticEvidence,
} from "./runtime-experiment-diagnostic-evidence.js";

export interface RuntimeProfileDifferentialCase {
  profile: CapturedMinecraftRuntimeProfile;
  definition: RuntimeExperimentDefinition;
  qualification: RuntimeExperimentQualification;
  trials: readonly RuntimeExperimentTrial[];
}

export type RuntimeProfileComparisonDisposition =
  | "stable"
  | "divergent"
  | "insufficient";

export interface RuntimeProfileStateObservation {
  profileFingerprint: string;
  edition:
    CapturedMinecraftRuntimeProfile["profile"]["product"]["edition"];
  host:
    CapturedMinecraftRuntimeProfile["profile"]["host"];
  version: string;
  scriptModules:
    CapturedMinecraftRuntimeProfile["profile"]["scriptModules"];
  experiments: readonly string[];
  armId: string;
  role: "control" | "treatment";
  predicate: string;
  state: "present" | "absent" | "unknown";
  evidenceIds: readonly string[];
}

export interface RuntimeProfilePredicateComparison {
  key: string;
  predicate: string;
  role: "control" | "treatment";
  disposition: RuntimeProfileComparisonDisposition;
  states: readonly RuntimeProfileStateObservation[];
}

export interface RuntimeProfileDifferentialReport {
  experimentId?: string;
  differentialContractRevision?: string;
  disposition: RuntimeProfileComparisonDisposition;
  validationErrors: readonly string[];
  comparisons: readonly RuntimeProfilePredicateComparison[];
}

function caseValidationErrors(
  item: RuntimeProfileDifferentialCase,
  index: number,
): string[] {
  const errors: string[] = [];
  const prefix = "case[" + index + "]";

  if (
    item.profile.fingerprint !==
      item.definition.targetProfileFingerprint
  ) {
    errors.push(
      prefix +
        " captured runtime profile fingerprint does not match experiment targetProfileFingerprint.",
    );
  }

  if (
    item.qualification.experimentId !==
      item.definition.id
  ) {
    errors.push(
      prefix +
        " qualification experimentId does not match experiment definition.",
    );
  }

  if (
    item.qualification.state !== "repeatable" &&
    item.qualification.state !== "intervention-supported"
  ) {
    errors.push(
      prefix +
        " is not independently repeatable; profile comparison requires repeatable or intervention-supported qualification.",
    );
  }

  for (const trial of item.trials) {
    if (
      trial.identity.experimentId !==
        item.definition.id
    ) {
      errors.push(
        prefix +
          " contains a trial from another experiment.",
      );
      break;
    }
    if (
      trial.identity.targetProfileFingerprint !==
        item.profile.fingerprint
    ) {
      errors.push(
        prefix +
          " contains a trial bound to another runtime profile.",
      );
      break;
    }
  }

  return errors;
}

function stateForRole(
  item: RuntimeProfileDifferentialCase,
  predicate: string,
  role: "control" | "treatment",
): RuntimeProfileStateObservation | undefined {
  const bridge = runtimeExperimentDiagnosticEvidence(
    item.qualification,
    item.trials,
  );
  const evidence = bridge.predicates.find(
    (candidate) => candidate.predicate === predicate,
  );
  const arm = evidence?.armObservations?.find(
    (candidate) => candidate.role === role,
  );
  if (!arm) return undefined;

  return {
    profileFingerprint: item.profile.fingerprint,
    edition: item.profile.profile.product.edition,
    host: item.profile.profile.host,
    version: item.profile.profile.product.version,
    scriptModules: item.profile.profile.scriptModules,
    experiments: [...item.profile.profile.experiments].sort(),
    armId: arm.armId,
    role,
    predicate,
    state: arm.observation.state,
    evidenceIds: [...arm.sourceEvidenceIds].sort(),
  };
}

export function compareRuntimeExperimentAcrossProfiles(
  cases: readonly RuntimeProfileDifferentialCase[],
): RuntimeProfileDifferentialReport {
  const errors: string[] = [];

  if (cases.length < 2) {
    errors.push(
      "Runtime profile differential requires at least two independently qualified profile cases.",
    );
  }

  cases.forEach((item, index) => {
    errors.push(...caseValidationErrors(item, index));
  });

  const experimentIds = new Set(
    cases.map((item) => item.definition.id),
  );
  if (experimentIds.size > 1) {
    errors.push(
      "Runtime profile differential cases must use the same logical experiment id.",
    );
  }

  const contractRevisions = new Set(
    cases.map((item) =>
      runtimeExperimentDifferentialContractRevision(
        item.definition,
      )
    ),
  );
  if (contractRevisions.size > 1) {
    errors.push(
      "Runtime profile differential cases do not share the same profile-independent experiment contract.",
    );
  }

  if (errors.length > 0) {
    return {
      disposition: "insufficient",
      validationErrors: [...new Set(errors)].sort(),
      comparisons: [],
    };
  }

  const first = cases[0]!;
  const comparisons: RuntimeProfilePredicateComparison[] = [];

  for (const predicate of first.definition.outcomePredicateIds) {
    for (const role of ["control", "treatment"] as const) {
      const states = cases
        .map((item) =>
          stateForRole(item, predicate, role)
        )
        .filter(
          (
            item,
          ): item is RuntimeProfileStateObservation =>
            item !== undefined,
        );

      const deterministic =
        states.length === cases.length &&
        states.every(
          (item) => item.state !== "unknown",
        );
      const distinctStates = new Set(
        states.map((item) => item.state),
      );

      comparisons.push({
        key:
          predicate +
          "@role:" +
          role,
        predicate,
        role,
        disposition:
          !deterministic
            ? "insufficient"
            : distinctStates.size === 1
              ? "stable"
              : "divergent",
        states,
      });
    }
  }

  const disposition: RuntimeProfileComparisonDisposition =
    comparisons.some(
      (item) => item.disposition === "divergent",
    )
      ? "divergent"
      : comparisons.some(
            (item) =>
              item.disposition === "insufficient",
          )
        ? "insufficient"
        : "stable";

  return {
    experimentId: first.definition.id,
    differentialContractRevision:
      runtimeExperimentDifferentialContractRevision(
        first.definition,
      ),
    disposition,
    validationErrors: [],
    comparisons,
  };
}

export interface RuntimeProfileDifferentialEvidence {
  observations: readonly DiagnosticEvidenceObservation[];
  evidenceIds: readonly string[];
}

export function runtimeProfileDifferentialEvidence(
  report: RuntimeProfileDifferentialReport,
): RuntimeProfileDifferentialEvidence {
  const observations: DiagnosticEvidenceObservation[] = [];
  const evidenceIds = new Set<string>();

  for (const comparison of report.comparisons) {
    const predicate =
      "runtime-profile-divergence:" +
      comparison.key;
    const present =
      comparison.disposition === "divergent";

    observations.push({
      predicate,
      state:
        comparison.disposition === "insufficient"
          ? "unknown"
          : present
            ? "present"
            : "absent",
      evidenceId:
        "runtime-profile-differential:" +
        comparison.key +
        ":" +
        comparison.disposition,
    });

    for (const state of comparison.states) {
      for (const id of state.evidenceIds) {
        evidenceIds.add(id);
      }
    }
  }

  return {
    observations,
    evidenceIds: [...evidenceIds].sort(),
  };
}
