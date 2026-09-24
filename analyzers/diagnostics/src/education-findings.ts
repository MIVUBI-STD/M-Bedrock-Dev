import { createDiagnostic } from "../../../packages/diagnostics/src/create.js";
import type { DiagnosticFinding } from "../../../packages/diagnostics/src/types.js";
import type { EducationProfile } from "../../../packages/compatibility/src/index.js";
import type { SourceRef } from "../../../packages/project-model/src/source-ref.js";

export function educationRequirementDiagnostic(
  profile: EducationProfile,
  source?: SourceRef,
): DiagnosticFinding | undefined {
  if (profile.educationFeatures === "enabled") return undefined;

  if (profile.educationFeatures === "disabled") {
    return createDiagnostic({
      code: "EDUCATION_FEATURE_DISABLED",
      severity: "medium",
      message: "Content requires Education features, but the target world has Education features disabled.",
      ...(source ? { source } : {}),
      data: {
        edition: profile.edition,
        eduLevel: profile.eduLevel,
      },
    });
  }

  return createDiagnostic({
    code: "EDUCATION_FEATURE_STATE_UNKNOWN",
    severity: "minor",
    message: "Content appears to require Education features, but the target Education feature state is unknown.",
    ...(source ? { source } : {}),
    data: {
      edition: profile.edition,
      manifestEducationMetadata: profile.manifestEducationMetadata,
    },
  });
}
