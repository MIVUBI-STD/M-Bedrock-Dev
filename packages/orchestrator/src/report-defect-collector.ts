import {
  promoteConfirmedBugsToV2,
  type ConfirmedBugReportInput,
  type PromoteConfirmedBugsResult,
  type BugReportV2Map,
  type BugReportV2RepairBy,
} from "../../bug-report/src/index.js";
import type {
  IntentDiagnosticGateResult,
} from "../../diagnostic-reasoning/src/index.js";
import type {
  GameplayIntentModel,
} from "../../gameplay-intent/src/index.js";
import type {
  GameplayIntentRuntimeAssessment,
} from "./gameplay-intent-runtime-stage.js";
import {
  confirmGameplayIntentRuntimeDefectForReport,
} from "./report-confirmation-adapter.js";
import {
  confirmStaticIntentDefectForReport,
} from "./static-report-confirmation-adapter.js";
import {
  confirmTesterDefectForReport,
  type TesterDefectConfirmationInput,
} from "./tester-report-confirmation-adapter.js";

type ConfirmedBugDraft = Omit<
  ConfirmedBugReportInput,
  "status" | "confirmation" | "foundBy"
>;

export interface RuntimeReportCandidate {
  readonly route: "runtime";
  readonly intent: GameplayIntentModel;
  readonly assessment: GameplayIntentRuntimeAssessment;
  readonly bug: ConfirmedBugDraft;
}

export interface StaticReportCandidate {
  readonly route: "static";
  readonly intent: GameplayIntentModel;
  readonly result: IntentDiagnosticGateResult;
  readonly bug: ConfirmedBugDraft;
}

export interface TesterReportCandidate {
  readonly route: "tester";
  readonly confirmation: TesterDefectConfirmationInput;
  readonly bug: ConfirmedBugDraft;
}

export type AuditReportCandidate =
  | RuntimeReportCandidate
  | StaticReportCandidate
  | TesterReportCandidate;

export interface RejectedReportCandidate {
  readonly route: AuditReportCandidate["route"];
  readonly bugId: string;
  readonly reasons: readonly string[];
}

export interface ConfirmedDefectCollection {
  readonly confirmed: readonly ConfirmedBugReportInput[];
  readonly rejected: readonly RejectedReportCandidate[];
}

function collectOne(
  candidate: AuditReportCandidate,
): {
  readonly confirmed?: ConfirmedBugReportInput;
  readonly rejected?: RejectedReportCandidate;
} {
  const decision =
    candidate.route === "runtime"
      ? confirmGameplayIntentRuntimeDefectForReport(
          candidate.intent,
          candidate.assessment,
        )
      : candidate.route === "static"
        ? confirmStaticIntentDefectForReport(
            candidate.intent,
            candidate.result,
          )
        : confirmTesterDefectForReport(
            candidate.confirmation,
          );

  if (!decision.confirmed) {
    return {
      rejected: {
        route: candidate.route,
        bugId: candidate.bug.id,
        reasons: decision.reasons,
      },
    };
  }

  return {
    confirmed: {
      ...candidate.bug,
      status: "confirmed-defect",
      foundBy:
        candidate.route === "tester"
          ? "tester"
          : "ai",
      confirmation: decision.confirmation,
    },
  };
}

export function collectConfirmedDefects(
  candidates: readonly AuditReportCandidate[],
): ConfirmedDefectCollection {
  const confirmed: ConfirmedBugReportInput[] = [];
  const rejected: RejectedReportCandidate[] = [];

  for (const candidate of candidates) {
    const result = collectOne(candidate);
    if (result.confirmed) {
      confirmed.push(result.confirmed);
    }
    if (result.rejected) {
      rejected.push(result.rejected);
    }
  }

  return {
    confirmed,
    rejected,
  };
}

export interface BuildBugReportFromAuditInput {
  readonly map: BugReportV2Map;
  readonly repairBy: BugReportV2RepairBy;
  readonly candidates: readonly AuditReportCandidate[];
}

export interface BuildBugReportFromAuditResult {
  readonly collection: ConfirmedDefectCollection;
  readonly promotion: PromoteConfirmedBugsResult;
}

export function buildBugReportFromAuditCandidates(
  input: BuildBugReportFromAuditInput,
): BuildBugReportFromAuditResult {
  const collection = collectConfirmedDefects(
    input.candidates,
  );

  return {
    collection,
    promotion: promoteConfirmedBugsToV2({
      map: input.map,
      repairBy: input.repairBy,
      bugs: collection.confirmed,
    }),
  };
}
