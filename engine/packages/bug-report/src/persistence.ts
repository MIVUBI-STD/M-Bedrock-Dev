import type { BugReportV2Map } from "./v2.js";

export const BUG_REPORT_WORKSPACE_DIRECTORY =
  "workspace/reports" as const;

function safeSegment(value: string): string {
  const cleaned = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "map";
}

export function buildBugReportFileName(
  map: BugReportV2Map,
): string {
  return (
    safeSegment(map.name) +
    "-v" +
    safeSegment(map.mapVersion) +
    "-BugReport.json"
  );
}

export function buildBugReportWorkspacePath(
  map: BugReportV2Map,
): string {
  return (
    BUG_REPORT_WORKSPACE_DIRECTORY +
    "/" +
    buildBugReportFileName(map)
  );
}
