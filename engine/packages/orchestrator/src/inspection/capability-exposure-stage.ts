import type {
  CapabilityExposureAssessment,
} from "../../../diagnostic-reasoning/src/index.js";
import type {
  DeveloperToolReleaseAnalysis,
} from "./developer-tool-release-analysis.js";

export interface CapabilityExposureSummary {
  readonly exposures:
    readonly CapabilityExposureAssessment[];
  readonly exposed: number;
  readonly potentiallyExposed: number;
  readonly releaseBlocking: number;
  readonly unresolved: number;
}

function blocksRelease(
  item: CapabilityExposureAssessment,
): boolean {
  return (
    (
      item.status === "exposed" ||
      item.status === "potentially-exposed"
    ) &&
    (
      item.impact === "progression" ||
      item.impact === "state" ||
      item.impact === "fairness"
    )
  );
}

export function summarizeCapabilityExposure(
  sources: {
    readonly developerTools?:
      DeveloperToolReleaseAnalysis;
    readonly additional?:
      readonly CapabilityExposureAssessment[];
  },
): CapabilityExposureSummary {
  const exposures = [
    ...(sources.developerTools?.exposures.map(
      (item) => item.exposure,
    ) ?? []),
    ...(sources.additional ?? []),
  ];

  return {
    exposures,
    exposed: exposures.filter(
      (item) => item.status === "exposed",
    ).length,
    potentiallyExposed: exposures.filter(
      (item) =>
        item.status === "potentially-exposed",
    ).length,
    releaseBlocking:
      exposures.filter(blocksRelease).length,
    unresolved: exposures.filter(
      (item) => item.status === "unknown",
    ).length,
  };
}
