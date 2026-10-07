export const BUG_TRACKER_SCHEMA = "m-bedrock-bug-tracker/v1" as const;

export type TrackerIssueType = "BUG" | "DESIGN_MISMATCH";
export type TrackerSeverity = "BLOCKER" | "MAJOR" | "MINOR";
export type TrackerVerification = "VERIFIED" | "NEEDS_VERIFY";

export interface TrackerSourceBinding {
  readonly projectId: string;
  readonly artifactId: string;
  readonly artifactFingerprint: string;
  readonly version: string;
  readonly driveFolder: string;
  readonly worldFile: string;
  readonly worldFilename: string;
  readonly bugReportPath?: string;
}

export interface TrackerIssue {
  readonly id: string;
  readonly type: TrackerIssueType;
  readonly severity: TrackerSeverity;
  readonly verification: TrackerVerification;
  readonly title: string;
  readonly issue: string;
  readonly whyThisIsBug?: string;
  readonly impact?: string;
  readonly reproduction: readonly string[];
  readonly observed: string;
  readonly expected: string;
  readonly resolution?: string;
  readonly technicalAnalysis?: string;
  readonly relevantCode?: readonly { readonly file: string; readonly reason: string }[];
  readonly mustPreserve?: readonly string[];
}

export interface TrackerDeveloperNote {
  readonly id: string;
  readonly type: "DEV_NOTE";
  readonly title: string;
  readonly problem: string;
  readonly action: string;
  readonly evidence: Readonly<Record<string, unknown>>;
  readonly severity: null;
}

export interface TrackerLevel {
  readonly level: number | null;
  readonly version: string;
  readonly source: TrackerSourceBinding;
  readonly issues: readonly TrackerIssue[];
  readonly devNotes: readonly TrackerDeveloperNote[];
}

export interface TrackerGame {
  readonly name: string;
  readonly levels: readonly TrackerLevel[];
}

export interface BugTrackerDocument {
  readonly schema: typeof BUG_TRACKER_SCHEMA;
  readonly title: "Bug Tracker Report";
  readonly games: readonly TrackerGame[];
}
