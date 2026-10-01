import {
  BUG_REPORT_V2_SCHEMA,
  parseBugReportV2,
  type BugReportV2,
} from "./v2.js";
import {
  parseBugReportJson,
  type BugReportParseIssue,
} from "./parse.js";
import type { BugReportV1 } from "./legacy-v1.js";

export type CurrentBugReportParseResult =
  | {
      readonly ok: true;
      readonly report: BugReportV2;
      readonly issues: readonly [];
    }
  | {
      readonly ok: false;
      readonly issues: readonly BugReportParseIssue[];
    };

export function migrateBugReportV1ToV2(
  report: BugReportV1,
): BugReportV2 {
  let sequence = 1;
  const bugs = report.bugFinders.flatMap((finder) =>
    finder.bugs.map((bug) => {
      const id =
        "BUG-" +
        String(sequence++)
          .padStart(3, "0");
      const observed =
        bug.observed.gameplay ??
        bug.observed.code ??
        bug.problem;
      const analysisParts = [
        bug.diagnosis,
        bug.rootCause,
        bug.observed.code,
      ].filter(
        (item): item is string =>
          typeof item === "string" &&
          item.trim().length > 0,
      );

      return {
        id,
        fixed: false,
        severity: bug.severity,
        category: finder.category,
        foundBy:
          bug.foundBy === "ai"
            ? "ai" as const
            : "tester" as const,
        title: bug.title,
        problem: bug.problem,
        expected: bug.expected,
        observed,
        ...(bug.reproduction === undefined
          ? {}
          : { reproduction: bug.reproduction }),
        ...(analysisParts.length === 0
          ? {}
          : {
              aiAnalysis:
                [...new Set(analysisParts)].join(" "),
            }),
        ...(bug.relevantCode === undefined
          ? {}
          : {
              relevantCode: bug.relevantCode.map(
                ({ file, reason }) => ({ file, reason }),
              ),
            }),
        ...(bug.repairDirection === undefined
          ? {}
          : { suggestedFix: bug.repairDirection }),
        ...(bug.mustPreserve === undefined
          ? {}
          : { mustPreserve: bug.mustPreserve }),
      };
    }),
  );

  return {
    schema: BUG_REPORT_V2_SCHEMA,
    map: {
      name: report.map.name,
      mapVersion: report.map.version,
      drive: report.map.drive,
      baseVersion: report.map.minecraftVersion,
      testedVersion: report.map.minecraftVersion,
    },
    repairBy: "developer",
    bugs,
  };
}

export function parseBugReportToCurrent(
  source: string,
): CurrentBugReportParseResult {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    return {
      ok: false,
      issues: [{
        code: "invalid-json",
        path: "$",
        message: "Input is not valid JSON.",
      }],
    };
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "schema" in value &&
    (value as { schema?: unknown }).schema ===
      BUG_REPORT_V2_SCHEMA
  ) {
    return parseBugReportV2(value);
  }

  const legacy = parseBugReportJson(source);
  if (!legacy.ok) return legacy;

  const migrated = migrateBugReportV1ToV2(legacy.report);
  return parseBugReportV2(migrated);
}
