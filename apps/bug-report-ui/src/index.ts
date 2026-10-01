export type BugReportUiPhase = "bug-report-v2";

export interface BugReportUiCapabilities {
  readonly phase: BugReportUiPhase;
  readonly fileImport: true;
  readonly fileExport: true;
  readonly githubReportStore: "backend-contract-ready";
  readonly mapAnalysis: false;
}

export const bugReportUiCapabilities: BugReportUiCapabilities = {
  phase: "bug-report-v2",
  fileImport: true,
  fileExport: true,
  githubReportStore: "backend-contract-ready",
  mapAnalysis: false,
};

export * from "./github-report-client.js";
export * from "./report-file.js";
export * from "./report-source.js";

export * from "./publication.js";
