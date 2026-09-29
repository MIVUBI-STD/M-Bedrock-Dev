import {
  BUG_REPORT_V2_SCHEMA,
  parseBugReportJson,
  parseBugReportV2,
  type BugReportParseIssue,
  type BugReportV1,
  type BugReportV2,
  type BugReportV2Map,
} from "../../../packages/bug-report/src/index.js";

export interface ReadableReportFile {
  readonly name: string;
  text(): Promise<string>;
}

export type ReadBugReportFileResult =
  | {
      readonly ok: true;
      readonly report: BugReportV2;
      readonly issues: readonly [];
    }
  | {
      readonly ok: false;
      readonly issues: readonly BugReportParseIssue[];
    };

function legacyToV2(
  report: BugReportV1,
): BugReportV2 {
  let sequence = 1;
  const issues = report.bugFinders.flatMap((finder) =>
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
                ({ file, reason }) => ({
                  file,
                  reason,
                }),
              ),
            }),
        ...(bug.repairDirection === undefined
          ? {}
          : {
              suggestedFix:
                bug.repairDirection,
            }),
        ...(bug.mustPreserve === undefined
          ? {}
          : {
              mustPreserve:
                bug.mustPreserve,
            }),
      };
    }),
  );

  return {
    schema: BUG_REPORT_V2_SCHEMA,
    map: {
      name: report.map.name,
      mapVersion: report.map.version,
      baseVersion:
        report.map.minecraftVersion,
      testedVersion:
        report.map.minecraftVersion,
    },
    repairBy: "developer",
    issues,
  };
}

export async function readBugReportFile(
  file: ReadableReportFile,
): Promise<ReadBugReportFileResult> {
  if (!file.name.toLowerCase().endsWith(".json")) {
    return {
      ok: false,
      issues: [{
        code: "invalid-value",
        path: "$",
        message: "Bug report must be a .json file.",
      }],
    };
  }

  const source = await file.text();
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

  return {
    ok: true,
    report: legacyToV2(legacy.report),
    issues: [],
  };
}

function safeSegment(value: string): string {
  const cleaned = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "map";
}

export function buildBugReportDownloadName(
  map: BugReportV2Map,
): string {
  return (
    safeSegment(map.name) +
    "-v" +
    safeSegment(map.mapVersion) +
    "-BugReport.json"
  );
}
