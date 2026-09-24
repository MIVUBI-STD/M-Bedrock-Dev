import type { ManifestModel } from "../../../analyzers/manifest/src/types.js";
import { educationRequirementDiagnostic } from "../../../analyzers/diagnostics/src/education-findings.js";
import { deriveEducationProfile } from "../../compatibility/src/education.js";
import type { DiagnosticFinding } from "../../diagnostics/src/types.js";
import type { InspectTargetProfile } from "./types.js";
import type { InspectionSourceIndex } from "./inspect-source-index.js";

export interface InspectionEducationInput {
  target: InspectTargetProfile;
  manifests: readonly ManifestModel[];
  parsedStructureModels:
    InspectionSourceIndex["parsedStructureModels"];
}

export function analyzeInspectionEducation(
  input: InspectionEducationInput,
) {
  const educationMetadata = input.manifests.some(
    (manifest) =>
      manifest.hasEducationMetadata === true,
  );

  const targetEducation = deriveEducationProfile({
    edition: input.target.edition ?? "unknown",
    manifestEducationMetadata: educationMetadata,
    ...(input.target.educationFeatures !== undefined
      ? {
          worldEducationFeatures:
            input.target.educationFeatures === "enabled",
        }
      : {}),
    ...(input.target.eduLevel !== undefined
      ? { eduLevel: input.target.eduLevel }
      : {}),
  });

  const educationSpecialtyBlocks = {
    allow: input.parsedStructureModels.reduce(
      (sum, item) =>
        sum + item.semantics.educationAllowEntries,
      0,
    ),
    deny: input.parsedStructureModels.reduce(
      (sum, item) =>
        sum + item.semantics.educationDenyEntries,
      0,
    ),
    border: input.parsedStructureModels.reduce(
      (sum, item) =>
        sum + item.semantics.educationBorderEntries,
      0,
    ),
  };

  const specialtyCount =
    educationSpecialtyBlocks.allow +
    educationSpecialtyBlocks.deny +
    educationSpecialtyBlocks.border;

  const diagnostics: DiagnosticFinding[] = [];

  if (specialtyCount > 0) {
    const finding =
      educationRequirementDiagnostic(targetEducation);
    if (finding) {
      diagnostics.push({
        ...finding,
        data: {
          ...(finding.data ?? {}),
          educationSpecialtyBlocks,
        },
      });
    }
  }

  return {
    targetEducation,
    educationSpecialtyBlocks,
    diagnostics,
  };
}
