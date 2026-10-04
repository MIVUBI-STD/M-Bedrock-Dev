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
  readonly reproduction: readonly string[];
  readonly observed: string;
  readonly expected: string;
  readonly resolution?: string;
  readonly technicalAnalysis?: string;
  readonly relevantCode?: readonly { readonly file: string; readonly reason: string }[];
  readonly mustPreserve?: readonly string[];
}

export interface TrackerLevel {
  readonly level: number | null;
  readonly version: string;
  readonly source: TrackerSourceBinding;
  readonly issues: readonly TrackerIssue[];
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
