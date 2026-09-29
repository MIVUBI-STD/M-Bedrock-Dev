import type {
  BugReportV1,
  BugReportValidationIssue,
} from "./index.js";
import {
  normalizeBugReportV1,
  validateBugReportSemantics,
} from "./index.js";

export type BugReportSerializeResult =
  | {
      readonly ok: true;
      readonly report: BugReportV1;
      readonly json: string;
      readonly issues: readonly [];
    }
  | {
      readonly ok: false;
      readonly issues: readonly BugReportValidationIssue[];
    };

export function serializeBugReportV1(
  report: BugReportV1,
): BugReportSerializeResult {
  const validation = validateBugReportSemantics(report);
  if (!validation.valid) {
    return {
      ok: false,
      issues: validation.issues,
    };
  }

  const normalized = normalizeBugReportV1(report);
  return {
    ok: true,
    report: normalized,
    json: JSON.stringify(normalized, null, 2) + "\n",
    issues: [],
  };
}
