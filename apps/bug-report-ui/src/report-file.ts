import {
  parseBugReportToCurrent,
  type BugReportParseIssue,
  type BugReportV2,
  type BugReportV2Map,
} from "../../../engine/packages/bug-report/src/index.js";

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

  return parseBugReportToCurrent(await file.text());
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
