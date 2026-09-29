export type ReviewUiPrototypeStatus = {
  readonly phase: "bug-report-v1";
  readonly reportImportConnected: true;
  readonly canonicalExportConnected: true;
  readonly mapAnalysisConnected: false;
};

export const reviewUiPrototypeStatus: ReviewUiPrototypeStatus = {
  phase: "bug-report-v1",
  reportImportConnected: true,
  canonicalExportConnected: true,
  mapAnalysisConnected: false,
};

export * from "./report-file.js";
