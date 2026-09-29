import type {
  BugReportV2,
} from "../../../packages/bug-report/src/index.js";

export type ReportSource =
  | {
      readonly kind: "file";
      readonly fileName: string;
    }
  | {
      readonly kind: "github";
      readonly path: string;
      readonly revision: string;
    };

export interface ReportDocument {
  readonly report: BugReportV2;
  readonly source: ReportSource;
  readonly dirty: boolean;
}

export interface GitHubReportSummary {
  readonly path: string;
  readonly mapName: string;
  readonly mapVersion: string;
  readonly fixed: number;
  readonly total: number;
  readonly blockers: number;
}

export interface LoadedGitHubReport {
  readonly report: BugReportV2;
  readonly revision: string;
}

export interface SavedGitHubReport {
  readonly revision: string;
}

export interface GitHubReportStore {
  listReports(): Promise<readonly GitHubReportSummary[]>;
  loadReport(path: string): Promise<LoadedGitHubReport>;
  createReport(
    path: string,
    report: BugReportV2,
  ): Promise<SavedGitHubReport>;
  saveReport(
    path: string,
    report: BugReportV2,
    expectedRevision: string,
  ): Promise<SavedGitHubReport>;
}
