import type {
  MutationScoreReport,
  MutationTestResult,
  SourceMutation,
} from "./mutation-types.js";
import { mutationScoreReport } from "./mutation-runner.js";

export type SourceMutationDetector = (
  mutation: SourceMutation,
) => {
  killed: boolean;
  invalid?: boolean;
  evidence?: string;
} | Promise<{
  killed: boolean;
  invalid?: boolean;
  evidence?: string;
}>;

export async function runSourceMutationCampaign(
  mutations: readonly SourceMutation[],
  detector: SourceMutationDetector,
): Promise<MutationScoreReport> {
  const results: MutationTestResult[] = [];

  for (const mutation of mutations) {
    try {
      const detection = await detector(mutation);
      results.push({
        descriptor: mutation.descriptor,
        status: detection.invalid
          ? "invalid"
          : detection.killed
            ? "killed"
            : "survived",
        ...(detection.evidence ? { evidence: detection.evidence } : {}),
      });
    } catch (error) {
      results.push({
        descriptor: mutation.descriptor,
        status: "invalid",
        evidence: error instanceof Error ? error.message : "Detector failed.",
      });
    }
  }

  return mutationScoreReport(results);
}
