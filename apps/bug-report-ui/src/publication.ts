import {
  projectBugReportClientDocument,
  reviewBugReportClientDocument,
  type BugReportClientDocument,
  type BugReportV2,
} from "../../../engine/packages/bug-report/src/index.js";

export interface BugReportPublicationPayload {
  readonly googleDocTitle: string;
  readonly pdfFileName: string;
  readonly destinationDriveUrl: string;
  readonly document: BugReportClientDocument;
}

function safeFileSegment(value: string): string {
  const cleaned = value
    .trim()
    .replace(/[^a-zA-Z0-9._ -]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "Map";
}

export function buildBugReportPublicationPayload(
  report: BugReportV2,
  options: {
    readonly includeFixed?: boolean;
  } = {},
): BugReportPublicationPayload {
  const document = projectBugReportClientDocument(
    report,
    {
      includeFixed: options.includeFixed,
    },
  );
  const qualityIssues =
    reviewBugReportClientDocument(document);

  if (qualityIssues.length > 0) {
    throw new Error(
      "Client document is not publication-ready: " +
      qualityIssues
        .map((issue) =>
          issue.path + ": " + issue.message
        )
        .join("; "),
    );
  }

  const mapName =
    safeFileSegment(report.map.name);
  const version =
    safeFileSegment(report.map.mapVersion);
  const base =
    mapName +
    " v" +
    version +
    " - Bug Report";

  return {
    googleDocTitle: base,
    pdfFileName: base + ".pdf",
    destinationDriveUrl: report.map.drive,
    document,
  };
}
