import type {
  BugReportClientDocument,
  BugReportV2,
} from "../../../engine/packages/bug-report/src/index.js";
import {
  buildBugReportPublicationPayload,
  type BugReportPublicationPayload,
} from "./publication.js";

export interface PublishedGoogleDoc {
  readonly documentId: string;
  readonly url: string;
  readonly title: string;
}

export interface PublishedPdf {
  readonly fileName: string;
  readonly url?: string;
}

export interface BugReportPublicationProvider {
  createGoogleDoc(input: {
    readonly title: string;
    readonly document: BugReportClientDocument;
  }): Promise<PublishedGoogleDoc>;

  exportGoogleDocAsPdf(input: {
    readonly documentId: string;
    readonly fileName: string;
  }): Promise<PublishedPdf>;
}

export interface PublishedBugReport {
  readonly payload: BugReportPublicationPayload;
  readonly googleDoc: PublishedGoogleDoc;
  readonly pdf: PublishedPdf;
}

export async function publishBugReport(
  report: BugReportV2,
  provider: BugReportPublicationProvider,
  options: {
    readonly includeFixed?: boolean;
  } = {},
): Promise<PublishedBugReport> {
  const payload =
    buildBugReportPublicationPayload(
      report,
      options,
    );

  const googleDoc =
    await provider.createGoogleDoc({
      title: payload.googleDocTitle,
      document: payload.document,
    });

  if (!googleDoc.documentId.trim()) {
    throw new Error(
      "Publication provider returned an empty Google Doc ID.",
    );
  }

  const pdf =
    await provider.exportGoogleDocAsPdf({
      documentId: googleDoc.documentId,
      fileName: payload.pdfFileName,
    });

  return {
    payload,
    googleDoc,
    pdf,
  };
}
