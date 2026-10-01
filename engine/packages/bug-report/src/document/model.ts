import type {
  BugReportV2,
} from "../v2.js";
import type {
  BugSeverity,
} from "../vocabulary.js";

export const BUG_REPORT_CLIENT_DOCUMENT_SCHEMA =
  "m-bedrock-bug-report-client-document/v1" as const;

export type BugReportClientIssueStatus =
  | "open"
  | "fixed";

export interface BugReportClientDocumentMap {
  readonly name: string;
  readonly mapVersion: string;
  readonly testedVersion: string;
}

export interface BugReportClientDocumentSummary {
  readonly visibleIssues: number;
  readonly openIssues: number;
  readonly fixedIssues: number;
  readonly blocker: number;
  readonly major: number;
  readonly minor: number;
  readonly statement: string;
}

export interface BugReportClientSeverityLegendItem {
  readonly severity: BugSeverity;
  readonly label: string;
  readonly meaning: string;
}

export interface BugReportClientIssueIndexItem {
  readonly number: number;
  readonly severity: BugSeverity;
  readonly status: BugReportClientIssueStatus;
  readonly title: string;
}

export interface BugReportClientIssue {
  readonly number: number;
  readonly severity: BugSeverity;
  readonly status: BugReportClientIssueStatus;
  readonly title: string;
  readonly issue: string;
  readonly reproduction: readonly string[];
  readonly observed: string;
  readonly expected: string;
  readonly recommendedResolution?: string;
}

export interface BugReportClientDocument {
  readonly schema:
    typeof BUG_REPORT_CLIENT_DOCUMENT_SCHEMA;
  readonly documentType: "Bug Report";
  readonly title: string;
  readonly subtitle: string;
  readonly audience: "client";
  readonly map: BugReportClientDocumentMap;
  readonly summary: BugReportClientDocumentSummary;
  readonly severityLegend:
    readonly BugReportClientSeverityLegendItem[];
  readonly issueIndex:
    readonly BugReportClientIssueIndexItem[];
  readonly issues: readonly BugReportClientIssue[];
  readonly source: {
    readonly schema: BugReportV2["schema"];
    readonly issueScope: "open" | "all";
    readonly severityScope: "blocker-major" | "all";
  };
}
