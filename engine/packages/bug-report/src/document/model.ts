import type {
  BugSeverity,
} from "../vocabulary.js";
import type {
  BugReportV2IssueType,
} from "../v2.js";

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

export interface BugReportClientIssue {
  readonly number: number;
  readonly id: string;
  readonly issueType: BugReportV2IssueType;
  readonly severity: BugSeverity;
  readonly status: BugReportClientIssueStatus;
  readonly category: string;
  readonly title: string;
  readonly issue: string;
  readonly reproduction: readonly string[];
  readonly observed: string;
  readonly expected: string;
  readonly recommendedResolution?: string;
  readonly technicalAnalysis?: string;
  readonly relevantCode?: readonly {
    readonly file: string;
    readonly reason: string;
  }[];
  readonly mustPreserve?: readonly string[];
}

export interface BugReportClientDocument {
  readonly schema:
    typeof BUG_REPORT_CLIENT_DOCUMENT_SCHEMA;
  readonly title: string;
  readonly subtitle: string;
  readonly map: BugReportClientDocumentMap;
  readonly summary: BugReportClientDocumentSummary;
  readonly severityLegend:
    readonly BugReportClientSeverityLegendItem[];
  readonly issues: readonly BugReportClientIssue[];
}
