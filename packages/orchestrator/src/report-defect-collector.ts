import {
  buildBugReportFromConfirmedDefects,
  type ConfirmedDefect,
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
import type {
  DiagnosticRepairDecision,
  FileInventoryEntry,
  InvariantRegistrySnapshot,
} from "../../project-model/src/index.js";
import type {
  RepairInvariantDerivation,
} from "./repair-invariant-derivation.js";
import {
  applyReportRepairContext,
} from "./report-repair-context.js";
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

export type ConfirmedDefectDraft = Omit<
  ConfirmedDefect,
  "foundBy" | "confirmation" | "mustPreserve"
>;

export interface ReportCandidateRepairContext {
  readonly decision?: DiagnosticRepairDecision;
  readonly invariantDerivation?: RepairInvariantDerivation;
  readonly invariantRegistry?: InvariantRegistrySnapshot;
}

export interface RuntimeReportCandidate {
  readonly route: "runtime";
  readonly intent: GameplayIntentModel;
  readonly assessment: GameplayIntentRuntimeAssessment;
  readonly defect: ConfirmedDefectDraft;
  readonly repairContext?: ReportCandidateRepairContext;
}

export interface StaticReportCandidate {
  readonly route: "static";
  readonly intent: GameplayIntentModel;
  readonly result: IntentDiagnosticGateResult;
  readonly defect: ConfirmedDefectDraft;
  readonly repairContext?: ReportCandidateRepairContext;
}

export interface TesterReportCandidate {
  readonly route: "tester";
  readonly confirmation: TesterDefectConfirmationInput;
  readonly defect: ConfirmedDefectDraft;
  readonly repairContext?: ReportCandidateRepairContext;
}

export type AuditReportCandidate =
  | RuntimeReportCandidate
  | StaticReportCandidate
  | TesterReportCandidate;

export interface RejectedReportCandidate {
  readonly route: AuditReportCandidate["route"];
  readonly semanticKey: string;
  readonly reasons: readonly string[];
}

export interface ConfirmedDefectCollection {
  readonly confirmed: readonly ConfirmedDefect[];
  readonly rejected: readonly RejectedReportCandidate[];
}

function intersects(
  left: readonly string[],
  right: readonly string[],
): boolean {
  const values = new Set(left);
  return right.some((value) => values.has(value));
}

function routeEvidenceConsistency(
  candidate: AuditReportCandidate,
): readonly string[] {
  if (candidate.route === "tester") {
    const errors: string[] = [];
    if (
      !intersects(
        candidate.defect.expected.evidenceIds,
        candidate.confirmation.expectedEvidenceIds,
      )
    ) {
      errors.push(
        "Defect Expected evidence is not grounded in the tester requirement evidence used for confirmation.",
      );
    }
    return errors;
  }

  const basisInvariantIds =
    candidate.route === "runtime"
      ? candidate.assessment.result.basisInvariantIds
      : candidate.result.basisInvariantIds;
  const basisIds = new Set(basisInvariantIds);
  const expectedEvidence = candidate.intent.invariants
    .filter((invariant) =>
      basisIds.has(invariant.id) &&
      invariant.status === "authored"
    )
    .flatMap((invariant) => invariant.evidenceIds);

  const observedEvidence =
    candidate.route === "runtime"
      ? [
          candidate.assessment.outcomeObservation.evidenceId,
          ...candidate.assessment.result.evidenceIds,
        ]
      : candidate.result.evidenceIds;

  const errors: string[] = [];
  if (
    expectedEvidence.length > 0 &&
    !intersects(
      candidate.defect.expected.evidenceIds,
      expectedEvidence,
    )
  ) {
    errors.push(
      "Defect Expected evidence is not grounded in the authored invariant evidence used for confirmation.",
    );
  }
  if (
    observedEvidence.length > 0 &&
    !intersects(
      candidate.defect.observed.evidenceIds,
      observedEvidence,
    )
  ) {
    errors.push(
      "Defect Observed evidence is not grounded in the evidence used for confirmation.",
    );
  }
  return errors;
}

function collectOne(
  candidate: AuditReportCandidate,
): {
  readonly confirmed?: ConfirmedDefect;
  readonly rejected?: RejectedReportCandidate;
} {
  const evidenceConsistency =
    routeEvidenceConsistency(candidate);
  if (evidenceConsistency.length > 0) {
    return {
      rejected: {
        route: candidate.route,
        semanticKey: candidate.defect.semanticKey,
        reasons: evidenceConsistency,
      },
    };
  }

  if (
    candidate.defect.suggestedFix !== undefined &&
    candidate.repairContext?.decision === undefined
  ) {
    return {
      rejected: {
        route: candidate.route,
        semanticKey: candidate.defect.semanticKey,
        reasons: [
          "Suggested Fix requires a diagnostic repair decision.",
        ],
      },
    };
  }

  const expectedAuthority =
    candidate.route === "tester"
      ? candidate.confirmation.expectedBehaviorAuthority
      : "authored-intent";

  if (candidate.defect.expected.authority !== expectedAuthority) {
    return {
      rejected: {
        route: candidate.route,
        semanticKey: candidate.defect.semanticKey,
        reasons: [
          "Defect Expected authority does not match the confirmation route authority.",
        ],
      },
    };
  }

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
        semanticKey: candidate.defect.semanticKey,
        reasons: decision.reasons,
      },
    };
  }

  const confirmed: ConfirmedDefect = {
    ...candidate.defect,
    foundBy:
      candidate.route === "tester"
        ? "tester"
        : "ai",
    confirmation: decision.confirmation,
  };

  return {
    confirmed: candidate.repairContext === undefined
      ? confirmed
      : applyReportRepairContext(
          confirmed,
          candidate.repairContext,
        ),
  };
}

export function collectConfirmedDefects(
  candidates: readonly AuditReportCandidate[],
): ConfirmedDefectCollection {
  const confirmed: ConfirmedDefect[] = [];
  const rejected: RejectedReportCandidate[] = [];

  for (const candidate of candidates) {
    const result = collectOne(candidate);
    if (result.confirmed) confirmed.push(result.confirmed);
    if (result.rejected) rejected.push(result.rejected);
  }

  return { confirmed, rejected };
}

export interface BuildBugReportFromAuditInput {
  readonly map: BugReportV2Map;
  readonly repairBy: BugReportV2RepairBy;
  readonly files: readonly FileInventoryEntry[];
  readonly candidates: readonly AuditReportCandidate[];
}

export interface BuildBugReportFromAuditResult {
  readonly collection: ConfirmedDefectCollection;
  readonly promotion: PromoteConfirmedBugsResult;
}

function sourceEvidenceIssues(
  defects: readonly ConfirmedDefect[],
  files: readonly FileInventoryEntry[],
): readonly {
  code: "invalid-confirmed-defect";
  message: string;
}[] {
  const known = new Set(
    files.map((file) =>
      file.relativePath.replaceAll("\\", "/")
    ),
  );
  const issues: {
    code: "invalid-confirmed-defect";
    message: string;
  }[] = [];

  for (const defect of defects) {
    for (const item of defect.sourceEvidence ?? []) {
      const path =
        item.source.relativePath.replaceAll("\\", "/");
      if (!known.has(path)) {
        issues.push({
          code: "invalid-confirmed-defect",
          message:
            defect.semanticKey +
            ": source evidence path is not present in the audited file inventory: " +
            path +
            ".",
        });
      }
    }
  }

  return issues;
}

export function buildBugReportFromAuditCandidates(
  input: BuildBugReportFromAuditInput,
): BuildBugReportFromAuditResult {
  const collection = collectConfirmedDefects(
    input.candidates,
  );
  const sourceIssues = sourceEvidenceIssues(
    collection.confirmed,
    input.files,
  );

  return {
    collection,
    promotion:
      sourceIssues.length > 0
        ? {
            ok: false,
            issues: sourceIssues,
          }
        : buildBugReportFromConfirmedDefects({
            map: input.map,
            repairBy: input.repairBy,
            defects: collection.confirmed,
          }),
  };
}
