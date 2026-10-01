import { reviewBugReportCopy } from "./copy-quality.js";
import {
  BUG_REPORT_V2_SCHEMA,
  parseBugReportV2,
  type BugReportV2,
  type BugReportV2Bug,
  type BugReportV2Map,
  type BugReportV2RepairBy,
} from "./v2.js";

export interface CreateBugReportV2BugInput
  extends Omit<BugReportV2Bug, "fixed"> {
  readonly fixed?: boolean;
}

export interface CreateBugReportV2Input {
  readonly map: BugReportV2Map;
  readonly repairBy: BugReportV2RepairBy;
  readonly bugs: readonly CreateBugReportV2BugInput[];
}

export function createBugReportV2(
  input: CreateBugReportV2Input,
): BugReportV2 {
  const candidate: BugReportV2 = {
    schema: BUG_REPORT_V2_SCHEMA,
    map: input.map,
    repairBy: input.repairBy,
    bugs: input.bugs.map((bug) => ({
      ...bug,
      fixed: bug.fixed ?? false,
    })),
  };

  const parsed = parseBugReportV2(candidate);
  if (!parsed.ok) {
    throw new Error(
      "Bug Report V2 creation failed: " +
        parsed.issues
          .map((issue) =>
            issue.path + ": " + issue.message
          )
          .join("; "),
    );
  }

  const copyIssues = reviewBugReportCopy(parsed.report.bugs);
  if (copyIssues.length > 0) {
    throw new Error(
      "Bug Report V2 copy quality failed: " +
        copyIssues
          .map((issue) =>
            issue.path + ": " + issue.message
          )
          .join("; "),
    );
  }

  return parsed.report;
}
