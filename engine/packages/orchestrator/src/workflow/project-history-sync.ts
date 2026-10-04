import {
  bugReportV2IssueType,
  type BugFinderCategory,
  type BugReportV2,
} from "../../../bug-report/src/index.js";
import {
  historicalRegressionId,
  mergeAndSaveHistoricalRegressions,
  type HistoricalRegressionRecord,
} from "../../../reliability-search/src/index.js";
import {
  projectLifecycleStatus,
} from "../../../project-model/src/index.js";
import type {
  ProjectRecord,
} from "../../../project-model/src/index.js";

const DOMAIN_BY_CATEGORY:
  Readonly<Record<BugFinderCategory, string>> = {
    "game-flow": "gameplay",
    "player-state": "state",
    "multiplayer-session": "multiplayer",
    "world-interaction": "world",
    "entity-behavior": "entities",
    "combat": "combat",
    "score-reward": "economy",
    "ui-feedback": "ui",
    "performance-stability": "stability",
    "compatibility": "compatibility",
  };

const CAPABILITIES_BY_CATEGORY:
  Readonly<Record<BugFinderCategory, readonly string[]>> = {
    "game-flow": [
      "gameplay-state",
      "progression",
    ],
    "player-state": [
      "state",
      "persistence",
    ],
    "multiplayer-session": [
      "multiplayer",
      "arena-lifecycle",
    ],
    "world-interaction": [
      "world-mutation",
      "spatial",
    ],
    "entity-behavior": [
      "entity-ai",
      "navigation",
    ],
    combat: [
      "combat",
      "entity-ai",
    ],
    "score-reward": [
      "economy",
      "reward",
    ],
    "ui-feedback": [
      "ui-state",
      "gameplay-state",
    ],
    "performance-stability": [
      "runtime-stability",
      "chunks",
    ],
    compatibility: [
      "compatibility",
      "platform",
    ],
  };

function unique(
  values: readonly string[],
): string[] {
  return [...new Set(
    values
      .map((value) => value.trim())
      .filter(Boolean),
  )].sort();
}

export function projectApprovedBugReportToHistoricalRegressions(
  input: {
    readonly projectId: string;
    readonly report: BugReportV2;
    readonly reportPath: string;
    readonly artifactFingerprint: string;
  },
): readonly HistoricalRegressionRecord[] {
  return input.report.bugs.map(
    (bug) => ({
      id: historicalRegressionId({
        mapName: input.report.map.name,
        mapVersion:
          input.report.map.mapVersion,
        bugId: bug.id,
      }),
      title: bug.title,
      issueType:
        bugReportV2IssueType(bug),
      domain:
        DOMAIN_BY_CATEGORY[
          bug.category
        ],
      discoveredBy:
        bug.foundBy === "tester"
          ? "approved-tester"
          : "approved-ai",
      provenance: {
        source:
          "Canonical Bug Report V2",
        projectId: input.projectId,
        reportPath: input.reportPath,
        map: input.report.map.name,
        mapVersion:
          input.report.map.mapVersion,
        bugId: bug.id,
        issueType:
          bugReportV2IssueType(bug),
        artifactFingerprint:
          input.artifactFingerprint,
      },
      triggerTags: unique([
        "gameplay",
        bug.category,
        bug.severity,
        bugReportV2IssueType(bug)
          .toLowerCase()
          .replaceAll("_", "-"),
      ]),
      capabilityTags: [
        ...CAPABILITIES_BY_CATEGORY[
          bug.category
        ],
      ],
      ...(bug.reproduction?.length
        ? {
            reproduction: [
              ...bug.reproduction,
            ],
          }
        : {}),
      expected: bug.expected,
      observed: bug.observed,
    }),
  );
}

/**
 * Historical issue knowledge is committed only after explicit project
 * approval. It never mutates ProjectRecord; the reliability catalog itself is
 * the sole owner of historical incident linkage.
 */
export async function syncApprovedProjectIssueHistory(
  input: {
    readonly repositoryRoot: string;
    readonly project: ProjectRecord;
    readonly report: BugReportV2;
    readonly reportPath: string;
  },
): Promise<{
  readonly historicalRegressionIds:
    readonly string[];
}> {
  const lifecycle =
    projectLifecycleStatus(
      input.project,
    );
  if (
    lifecycle !== "approved" &&
    lifecycle !== "drive-published"
  ) {
    throw new Error(
      "Historical issue sync requires an approved project.",
    );
  }
  if (
    input.project.knowledge
      .bugReportPath !==
    input.reportPath
  ) {
    throw new Error(
      "Project Bug Report reference does not match the canonical report being projected.",
    );
  }

  const records =
    projectApprovedBugReportToHistoricalRegressions({
      projectId:
        input.project.projectId,
      report: input.report,
      reportPath: input.reportPath,
      artifactFingerprint:
        input.project.artifact
          .artifactFingerprint,
    });

  await mergeAndSaveHistoricalRegressions(
    input.repositoryRoot,
    records,
  );

  return {
    historicalRegressionIds:
      records
        .map((item) => item.id)
        .sort(),
  };
}
