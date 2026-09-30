export interface WorldReleaseStateInput {
  experiments?: Readonly<Record<string, boolean | number | string | null | undefined>>;
  educationFeaturesEnabled?: boolean;
  playerPermissionsLevel?: number;
  lastOpenedWithVersion?: readonly number[];
  allowedExperiments?: readonly string[];
  expectedEducationFeaturesEnabled?: boolean;
  maximumDefaultPermissionLevel?: number;
  minimumOpenedVersion?: readonly number[];
}

export interface WorldReleaseStateFinding {
  code:
    | "WORLD_UNAPPROVED_EXPERIMENT"
    | "WORLD_EDUCATION_MODE_MISMATCH"
    | "WORLD_DEFAULT_PERMISSION_TOO_HIGH"
    | "WORLD_OPENED_VERSION_TOO_OLD";
  severity: "blocker" | "major" | "minor";
  message: string;
  data?: Readonly<Record<string, unknown>>;
}

export interface WorldReleaseStateAssessment {
  releasable: boolean;
  findings: readonly WorldReleaseStateFinding[];
}

function compareVersion(a: readonly number[], b: readonly number[]): number {
  const size = Math.max(a.length, b.length);
  for (let index = 0; index < size; index += 1) {
    const left = a[index] ?? 0;
    const right = b[index] ?? 0;
    if (left !== right) return left < right ? -1 : 1;
  }
  return 0;
}

export function assessWorldReleaseState(
  input: WorldReleaseStateInput,
): WorldReleaseStateAssessment {
  const findings: WorldReleaseStateFinding[] = [];
  const allowed = new Set(input.allowedExperiments ?? []);

  for (const [name, value] of Object.entries(input.experiments ?? {})) {
    if (value === true && !allowed.has(name)) {
      findings.push({
        code: "WORLD_UNAPPROVED_EXPERIMENT",
        severity: "major",
        message: 'World experiment "' + name + '" is enabled but not allow-listed for release.',
        data: { experiment: name },
      });
    }
  }

  if (
    input.expectedEducationFeaturesEnabled !== undefined &&
    input.educationFeaturesEnabled !== undefined &&
    input.educationFeaturesEnabled !== input.expectedEducationFeaturesEnabled
  ) {
    findings.push({
      code: "WORLD_EDUCATION_MODE_MISMATCH",
      severity: "major",
      message:
        "Education features are " +
        (input.educationFeaturesEnabled ? "enabled" : "disabled") +
        "; release policy expects " +
        (input.expectedEducationFeaturesEnabled ? "enabled" : "disabled") + ".",
    });
  }

  const maximumPermission = input.maximumDefaultPermissionLevel ?? 1;
  if (
    input.playerPermissionsLevel !== undefined &&
    input.playerPermissionsLevel > maximumPermission
  ) {
    findings.push({
      code: "WORLD_DEFAULT_PERMISSION_TOO_HIGH",
      severity: "blocker",
      message:
        "Default player permission level " + input.playerPermissionsLevel +
        " exceeds release maximum " + maximumPermission + ".",
      data: {
        playerPermissionsLevel: input.playerPermissionsLevel,
        maximumDefaultPermissionLevel: maximumPermission,
      },
    });
  }

  if (
    input.lastOpenedWithVersion &&
    input.minimumOpenedVersion &&
    compareVersion(input.lastOpenedWithVersion, input.minimumOpenedVersion) < 0
  ) {
    findings.push({
      code: "WORLD_OPENED_VERSION_TOO_OLD",
      severity: "major",
      message:
        "World was last opened with " + input.lastOpenedWithVersion.join(".") +
        ", below required " + input.minimumOpenedVersion.join(".") + ".",
      data: {
        lastOpenedWithVersion: input.lastOpenedWithVersion,
        minimumOpenedVersion: input.minimumOpenedVersion,
      },
    });
  }

  return {
    releasable: !findings.some(
      (item) => item.severity === "blocker" || item.severity === "major",
    ),
    findings,
  };
}
