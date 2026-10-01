import type {
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

export interface GitHubReportSummary {
  readonly path: string;
  readonly mapName: string;
  readonly mapVersion: string;
  readonly fixed: number;
  readonly total: number;
  readonly blockers: number;
}

export interface GitHubReportStore {
  listReports(): Promise<readonly GitHubReportSummary[]>;
  loadReport(path: string): Promise<BugReportV2>;
  createReport(
    path: string,
    report: BugReportV2,
  ): Promise<void>;
}
