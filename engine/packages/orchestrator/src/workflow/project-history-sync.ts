import type {
  BugReportV2,
} from "../../../bug-report/src/index.js";
import {
  mergeAndSaveHistoricalRegressions,
  projectApprovedBugReportToHistoricalRegressions,
} from "../../../reliability-search/src/index.js";
import type {
  ProjectRecord,
} from "../../../project-model/src/index.js";
import {
  updateProjectRecord,
} from "./project-lifecycle.js";
import {
  upsertProjectRecord,
} from "./project-registry-store.js";

export async function syncApprovedProjectIssueHistory(input: {
  readonly repositoryRoot: string;
  readonly project: ProjectRecord;
  readonly report: BugReportV2;
  readonly reportPath: string;
}): Promise<{
  readonly project: ProjectRecord;
  readonly historicalRegressionIds: readonly string[];
}> {
  if (
    input.project.status !== "ready-for-approval" &&
    input.project.status !== "approved" &&
    input.project.status !== "drive-published"
  ) {
    throw new Error(
      "Historical issue sync requires a project that has passed approval readiness.",
    );
  }
  if (
    input.project.knowledge.bugReportPath !==
      input.reportPath
  ) {
    throw new Error(
      "Project Bug Report reference does not match the canonical report being projected.",
    );
  }

  const records =
    projectApprovedBugReportToHistoricalRegressions({
      report: input.report,
      reportPath: input.reportPath,
      artifactFingerprint:
        input.project.artifact.artifactFingerprint,
    });

  await mergeAndSaveHistoricalRegressions(
    input.repositoryRoot,
    records,
  );

  const nextProject =
    updateProjectRecord(
      input.project,
      {
        historicalRegressionIds:
          records.map((item) => item.id),
      },
    );

  await upsertProjectRecord(
    input.repositoryRoot,
    nextProject,
  );

  return {
    project: nextProject,
    historicalRegressionIds:
      records.map((item) => item.id).sort(),
  };
}
