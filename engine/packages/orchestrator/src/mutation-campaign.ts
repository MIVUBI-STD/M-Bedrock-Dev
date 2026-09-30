import {
  blindspotTasksFromMutationResults,
  mutateCommandSource,
  mutateScriptSource,
  runSourceMutationCampaign,
  type BlindspotTask,
  type MutationScoreReport,
} from "../../reliability-search/src/index.js";
import {
  createSourceMutationDetector,
  type SourceMutationFixture,
} from "./source-mutation-detection.js";
import {
  createScriptMutationDetector,
  type ScriptMutationFixture,
} from "./script-mutation-detection.js";

export interface CommandMutationCampaignResult {
  commandsMutated: number;
  mutantsGenerated: number;
  report: MutationScoreReport;
  survivedOperators: string[];
  blindspotTasks: BlindspotTask[];
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
    blindspotTasks: blindspotTasksFromMutationResults(report.results),
  };
}

export interface ScriptMutationCampaignResult {
  mutantsGenerated: number;
  report: MutationScoreReport;
  survivedOperators: string[];
  blindspotTasks: BlindspotTask[];
}

export async function runScriptMutationCampaign(
  fixture: ScriptMutationFixture,
): Promise<ScriptMutationCampaignResult> {
  const mutations = mutateScriptSource(fixture.source);
  const report = await runSourceMutationCampaign(
    mutations,
    createScriptMutationDetector(fixture),
  );

  return {
    mutantsGenerated: mutations.length,
    report,
    survivedOperators: [...new Set(
      report.results
        .filter((result) => result.status === "survived")
        .map((result) => result.descriptor.operator),
    )].sort(),
    blindspotTasks: blindspotTasksFromMutationResults(report.results),
  };
}
