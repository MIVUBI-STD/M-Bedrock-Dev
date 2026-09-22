import {
  mutateCommandSource,
  runSourceMutationCampaign,
  type MutationScoreReport,
} from "../../reliability-search/src/index.js";
import {
  createSourceMutationDetector,
  type SourceMutationFixture,
} from "./source-mutation-detection.js";

export interface CommandMutationCampaignResult {
  commandsMutated: number;
  mutantsGenerated: number;
  report: MutationScoreReport;
  survivedOperators: string[];
}

export async function runCommandMutationCampaign(
  fixture: SourceMutationFixture,
): Promise<CommandMutationCampaignResult> {
  const mutations = fixture.commands.flatMap((command) =>
    mutateCommandSource(command),
  );
  const report = await runSourceMutationCampaign(
    mutations,
    createSourceMutationDetector(fixture),
  );

  return {
    commandsMutated: fixture.commands.length,
    mutantsGenerated: mutations.length,
    report,
    survivedOperators: [...new Set(
      report.results
        .filter((result) => result.status === "survived")
        .map((result) => result.descriptor.operator),
    )].sort(),
  };
}
