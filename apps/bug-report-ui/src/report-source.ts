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

export type ReportSummary = BugReportSummary;

/** @deprecated Use ReportSummary. */
export type GitHubReportSummary = ReportSummary;

export interface ReportStore {
  listReports(): Promise<readonly BugReportSummary[]>;
  loadReport(path: string): Promise<BugReportV2>;
  createReport(
    path: string,
    report: BugReportV2,
  ): Promise<void>;
}

/** @deprecated Use ReportStore. */
export type GitHubReportStore = ReportStore;
