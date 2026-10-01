export interface BugReportSummary {
  readonly path: string;
  readonly mapName: string;
  readonly mapVersion: string;
  readonly fixed: number;
  readonly total: number;
  readonly blockers: number;
}
