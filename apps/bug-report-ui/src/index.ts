export type BugReportUiPhase = "bug-report-v2";

export interface BugReportUiCapabilities {
  readonly phase: BugReportUiPhase;
  readonly fileImport: true;
  readonly fileExport: true;
  readonly githubReportStore: "planned";
  readonly mapAnalysis: false;
}

export const bugReportUiCapabilities: BugReportUiCapabilities = {
  phase: "bug-report-v2",
  fileImport: true,
  fileExport: true,
  githubReportStore: "planned",
  mapAnalysis: false,
};

export * from "./report-file.js";
export * from "./report-source.js";
