import {
  buildBugReportFromConfirmedDefects,
  deriveConfirmedDefectSemanticKey,
  deriveRepairUnitIdsFromSourceEvidence,
  type ConfirmedDefect,
  type ConfirmedDefectGroupResolution,
  type PromoteConfirmedBugsResult,
  type BugReportV2Map,
  type BugReportV2RepairBy,
} from "../../bug-report/src/index.js";
import type {
  IntentDiagnosticGateResult,
  IntentDiagnosticNextEvidenceNeed,
} from "../../diagnostic-reasoning/src/index.js";
import type {
  GameplayIntentModel,
} from "../../gameplay-intent/src/index.js";
import type {
  GameplayIntentRuntimeAssessment,
} from "./gameplay-intent-runtime-stage.js";
import type {
  SemanticIr,
} from "../../semantic-ir/src/index.js";
import {
  sourceRefHasPreciseLocation,
  type DiagnosticRepairDecision,
  type FileInventoryEntry,
  type InvariantRegistrySnapshot,
} from "../../project-model/src/index.js";
import type {
  RepairInvariantDerivation,
} from "./repair-invariant-derivation.js";
import {
  applyReportRepairContext,
} from "./report-repair-context.js";
import {
  bindSourceEvidenceSemanticOwners,
} from "./report-source-owner.js";
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
  | "semanticKey"
  | "subjectIds"
  | "foundBy"
  | "confirmation"
  | "mustPreserve"
  | "repairUnitIds"
>;

export type AiConfirmedDefectDraft = Omit<
  ConfirmedDefectDraft,
  "brokenInvariantIds"
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
  readonly semanticIr?: SemanticIr;
  readonly defect: AiConfirmedDefectDraft;
  readonly repairContext?: ReportCandidateRepairContext;
}

export interface StaticReportCandidate {
  readonly route: "static";
  readonly intent: GameplayIntentModel;
  readonly result: IntentDiagnosticGateResult;
  readonly semanticIr?: SemanticIr;
  readonly defect: AiConfirmedDefectDraft;
  readonly repairContext?: ReportCandidateRepairContext;
}

export interface TesterReportCandidate {
  readonly route: "tester";
  readonly subjectIds: readonly string[];
  readonly confirmation: TesterDefectConfirmationInput;
  readonly semanticIr?: SemanticIr;
  readonly defect: ConfirmedDefectDraft;
  readonly repairContext?: ReportCandidateRepairContext;
}

export type AuditReportCandidate =
  | RuntimeReportCandidate
  | StaticReportCandidate
  | TesterReportCandidate;

export type ReportCandidateNextEvidenceNeed =
  | IntentDiagnosticNextEvidenceNeed
  | "tester-reproduction"
  | "expected-behavior-evidence"
  | "repair-decision"
  | "candidate-correction";

export interface RejectedReportCandidate {
  readonly route: AuditReportCandidate["route"];
  readonly semanticKey: string;
  readonly evidenceIds: readonly string[];
  readonly nextEvidenceNeed: ReportCandidateNextEvidenceNeed;
  readonly reasons: readonly string[];
}

export interface ConfirmedDefectCollection {
  readonly confirmed: readonly ConfirmedDefect[];
  readonly rejected: readonly RejectedReportCandidate[];
}

export interface AuditReportCandidateDescriptor {
  readonly route: AuditReportCandidate["route"];
  readonly semanticKey: string;
  readonly evidenceIds: readonly string[];
  readonly nextEvidenceNeed: ReportCandidateNextEvidenceNeed;
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

function candidateSubjectIds(
  candidate: AuditReportCandidate,
): readonly string[] {
  if (candidate.route === "runtime") {
    return candidate.assessment.result.subjectIds;
  }
  if (candidate.route === "static") {
    return candidate.result.subjectIds;
  }
  return candidate.subjectIds;
}

function candidateBrokenInvariantIds(
  candidate: AuditReportCandidate,
): readonly string[] {
  if (candidate.route === "runtime") {
    return candidate.assessment.result.basisInvariantIds;
  }
  if (candidate.route === "static") {
    return candidate.result.basisInvariantIds;
  }
  return candidate.defect.brokenInvariantIds;
}

function candidateSourceEvidence(
  candidate: AuditReportCandidate,
) {
  return bindSourceEvidenceSemanticOwners(
    candidate.defect.sourceEvidence,
    candidate.semanticIr,
  );
}

function semanticOwnerIssues(
  candidate: AuditReportCandidate,
): readonly string[] {
  const owners = [
    ...new Set(
      (candidateSourceEvidence(candidate) ?? [])
        .map((item) => item.semanticOwnerId?.trim())
        .filter(
          (value): value is string =>
            typeof value === "string" &&
            value.length > 0,
        ),
    ),
  ];

  if (owners.length === 0) return [];
  if (candidate.semanticIr === undefined) {
    return [
      "Semantic owner evidence requires Semantic IR for validation.",
    ];
  }

  const known = new Set(
    candidate.semanticIr.execution.regions.map(
      (region) => region.id,
    ),
  );

  return owners
    .filter((owner) => !known.has(owner))
    .map(
      (owner) =>
        "Source evidence semanticOwnerId is not present in Semantic IR: " +
        owner +
        ".",
    );
}

function candidateRepairUnitIds(
  candidate: AuditReportCandidate,
): readonly string[] {
  return deriveRepairUnitIdsFromSourceEvidence(
    candidateSourceEvidence(candidate),
  );
}

function candidateSemanticKey(
  candidate: AuditReportCandidate,
): string {
  return deriveConfirmedDefectSemanticKey({
    subjectIds: candidateSubjectIds(candidate),
    brokenInvariantIds:
      candidateBrokenInvariantIds(candidate),
    primaryFailure:
      candidate.defect.primaryFailure,
    ...(candidate.defect.causalIncidentId === undefined
      ? {}
      : {
          causalIncidentId:
            candidate.defect.causalIncidentId,
        }),
  });
}

function candidateEvidenceIds(
  candidate: AuditReportCandidate,
): readonly string[] {
  const values = [
    ...candidate.defect.expected.evidenceIds,
    ...candidate.defect.observed.evidenceIds,
    ...(candidate.route === "runtime"
      ? [
          candidate.assessment.outcomeObservation.evidenceId,
          ...candidate.assessment.result.evidenceIds,
        ]
      : candidate.route === "static"
        ? candidate.result.evidenceIds
        : candidate.confirmation.expectedEvidenceIds),
  ];

  return [...new Set(
    values.filter((value) => value.trim().length > 0),
  )].sort();
}

function routeNextEvidenceNeed(
  candidate: AuditReportCandidate,
): ReportCandidateNextEvidenceNeed {
  if (candidate.route === "runtime") {
    return candidate.assessment.result.nextEvidenceNeed;
  }
  if (candidate.route === "static") {
    return candidate.result.nextEvidenceNeed;
  }
  if (candidate.confirmation.expectedEvidenceIds.length === 0) {
    return "expected-behavior-evidence";
  }
  if (!candidate.confirmation.reproduced) {
    return "tester-reproduction";
  }
  return "none";
}

export function describeAuditReportCandidate(
  candidate: AuditReportCandidate,
): AuditReportCandidateDescriptor {
  return {
    route: candidate.route,
    semanticKey: candidateSemanticKey(candidate),
    evidenceIds: candidateEvidenceIds(candidate),
    nextEvidenceNeed: routeNextEvidenceNeed(candidate),
  };
}

function rejectedCandidate(
  candidate: AuditReportCandidate,
  reasons: readonly string[],
  nextEvidenceNeed:
    ReportCandidateNextEvidenceNeed =
      routeNextEvidenceNeed(candidate),
): RejectedReportCandidate {
  const descriptor =
    describeAuditReportCandidate(candidate);
  return {
    route: descriptor.route,
    semanticKey: descriptor.semanticKey,
    evidenceIds: descriptor.evidenceIds,
    nextEvidenceNeed,
    reasons,
  };
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
      rejected: rejectedCandidate(
        candidate,
        evidenceConsistency,
        "candidate-correction",
      ),
    };
  }

  const ownerIssues =
    semanticOwnerIssues(candidate);
  if (ownerIssues.length > 0) {
    return {
      rejected: rejectedCandidate(
        candidate,
        ownerIssues,
        "candidate-correction",
      ),
    };
  }

  if (
    candidate.defect.suggestedFix !== undefined &&
    candidate.repairContext?.decision === undefined
  ) {
    return {
      rejected: rejectedCandidate(
        candidate,
        [
          "Suggested Fix requires a diagnostic repair decision.",
        ],
        "repair-decision",
      ),
    };
  }

  const expectedAuthority =
    candidate.route === "tester"
      ? candidate.confirmation.expectedBehaviorAuthority
      : "authored-intent";

  if (candidate.defect.expected.authority !== expectedAuthority) {
    return {
      rejected: rejectedCandidate(
        candidate,
        [
          "Defect Expected authority does not match the confirmation route authority.",
        ],
        "candidate-correction",
      ),
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
      rejected: rejectedCandidate(
        candidate,
        decision.reasons,
      ),
    };
  }

  const boundSourceEvidence =
    candidateSourceEvidence(candidate);

  const confirmed: ConfirmedDefect = {
    ...candidate.defect,
    ...(boundSourceEvidence === undefined
      ? {}
      : { sourceEvidence: boundSourceEvidence }),
    semanticKey: candidateSemanticKey(candidate),
    subjectIds: [...candidateSubjectIds(candidate)],
    brokenInvariantIds: [
      ...candidateBrokenInvariantIds(candidate),
    ],
    repairUnitIds: [
      ...candidateRepairUnitIds(candidate),
    ],
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
  readonly groupResolutions?:
    readonly ConfirmedDefectGroupResolution[];
}

export interface BuildBugReportFromAuditResult {
  readonly collection: ConfirmedDefectCollection;
  readonly promotion: PromoteConfirmedBugsResult;
}

function lineAddressableSource(path: string): boolean {
  return /\.(?:ts|tsx|js|jsx|mcfunction)$/i.test(path);
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
        continue;
      }

      if (
        defect.foundBy === "ai" &&
        lineAddressableSource(path) &&
        !sourceRefHasPreciseLocation(item.source)
      ) {
        issues.push({
          code: "invalid-confirmed-defect",
          message:
            defect.semanticKey +
            ": line-addressable AI source evidence must include a precise range or location: " +
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
            ...(input.groupResolutions === undefined
              ? {}
              : {
                  groupResolutions:
                    input.groupResolutions,
                }),
          }),
  };
}
