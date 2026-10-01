export const BUG_REPORT_CLIENT_DOCUMENT_SECTION_ORDER = [
  "overview",
  "issue-summary",
  "severity-guide",
  "issue-details",
] as const;

export const BUG_REPORT_CLIENT_DOCUMENT_LABELS = {
  overview: "Report Overview",
  issueSummary: "Issue Summary",
  severityGuide: "Severity Guide",
  issueDetails: "Issue Details",
  issue: "Issue",
  reproduction: "How to Reproduce",
  observed: "Observed",
  expected: "Expected",
  recommendedResolution:
    "Recommended Resolution",
} as const;
