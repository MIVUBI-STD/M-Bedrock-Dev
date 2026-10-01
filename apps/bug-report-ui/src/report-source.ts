import type {
  BugReportSummary,
  BugReportV2,
} from "../../../engine/packages/bug-report/src/index.js";

export type ReportSource =
  | {
      readonly kind: "file";
      readonly fileName: string;
    }
  | {
      readonly kind: "github";
      readonly path: string;
    };

export type GitHubReportSummary = BugReportSummary;

export interface GitHubReportStore {
  listReports(): Promise<readonly BugReportSummary[]>;
  loadReport(path: string): Promise<BugReportV2>;
  createReport(
    path: string,
    report: BugReportV2,
  ): Promise<void>;
}
