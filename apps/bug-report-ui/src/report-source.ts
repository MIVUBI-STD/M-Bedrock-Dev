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
}

export interface GitHubReportStore {
  listReports(): Promise<readonly GitHubReportSummary[]>;
  loadReport(path: string): Promise<BugReportV2>;
  saveReport(path: string, report: BugReportV2): Promise<void>;
}
