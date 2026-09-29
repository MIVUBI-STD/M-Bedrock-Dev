import {
  parseBugReportJson,
  type BugReportMap,
  type BugReportParseResult,
} from "../../../packages/bug-report/src/index.js";

export interface ReadableReportFile {
  readonly name: string;
  text(): Promise<string>;
}

export async function readBugReportFile(
  file: ReadableReportFile,
): Promise<BugReportParseResult> {
  if (!file.name.toLowerCase().endsWith(".json")) {
    return {
      ok: false,
      issues: [
        {
          code: "invalid-value",
          path: "$",
          message: "Bug report must be a .json file.",
        },
      ],
    };
  }

  return parseBugReportJson(await file.text());
}

function safeSegment(value: string): string {
  const cleaned = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "map";
}

export function buildBugReportDownloadName(
  map: BugReportMap,
): string {
  return (
    safeSegment(map.name) +
    "-v" +
    safeSegment(map.version) +
    "-BugReport.json"
  );
}
