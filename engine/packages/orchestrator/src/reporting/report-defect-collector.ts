import {
  buildBugReportFromApprovedBugSet,
  compileBugTrigger,
  projectProposedBugSet,
  deriveConfirmedDefectSemanticKey,
  deriveRepairUnitIdsFromSourceEvidence,
  type ConfirmedDefect,
  type ConfirmedDefectGroupResolution,
  type PromoteConfirmedBugsResult,
  type ProposedBugSet,
  type ApprovedBugSet,
  type BugReportV2Map,
  type BugReportV2RepairBy,
  type BugTriggerDraft,
} from "../../../bug-report/src/index.js";
import {
  renderEngineeringAnalysis,
  type IntentDiagnosticGateResult,
  type IntentDiagnosticNextEvidenceNeed,
} from "../../../diagnostic-reasoning/src/index.js";
import type {
  GameplayIntentModel,
  GameplayModelClosureResult,
} from "../../../gameplay-intent/src/index.js";
import type {
  GameplayIntentRuntimeAssessment,
} from "../gameplay-intent-runtime-stage.js";
import type {
  InspectionEngineeringAnalysis,
} from "../inspection/engineering-analysis-stage.js";
import type {
  RuntimeExperimentDefinition,
} from "../../../runtime-lab/src/index.js";
import type {
  RuntimeExperimentDiagnosticBridge,
} from "../runtime-experiment-diagnostic-evidence.js";
import type {
  DiagnosticFinding,
} from "../../../diagnostics/src/index.js";
import type {
  SemanticIr,
} from "../../../semantic-ir/src/index.js";
import {
  sourceRefHasPreciseLocation,
  type DiagnosticRepairDecision,
  type FileInventoryEntry,
  type InvariantRegistrySnapshot,
} from "../../../project-model/src/index.js";
import type {
  RepairInvariantDerivation,
} from "../repair-invariant-derivation.js";
import {
  applyReportRepairContext,
} from "./report-repair-context.js";
import {
  deriveReportDefectClassification,
  type ReportDefectClassificationSignals,
} from "./report-defect-classification.js";
import {
  derivePrimaryFailureSignalsFromDiagnostics,
} from "./report-classification-producers.js";
import {
  deriveReportClassificationFromRuntimeExperiment,
} from "./report-runtime-classification.js";
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
  | "impact"
  | "primaryFailure"
  | "expected"
  | "observed"
> & {
  readonly expectedStatement?: string;
  readonly observedStatement: string;
  readonly classificationSignals:
    ReportDefectClassificationSignals;
};

export type AiConfirmedDefectDraft = Omit<
  ConfirmedDefectDraft,
  | "brokenInvariantIds"
  | "expectedStatement"
  | "reproduction"
> & {
  readonly expectedStatement: string;
  readonly reproduction?: never;
};

export interface ReportCandidateRepairContext {
  readonly decision?: DiagnosticRepairDecision;
  readonly invariantDerivation?: RepairInvariantDerivation;
  readonly invariantRegistry?: InvariantRegistrySnapshot;
}

export interface RuntimeReportCandidate {
  readonly route: "runtime";
  readonly bugTrigger?: BugTriggerDraft;
  readonly intent: GameplayIntentModel;
  readonly assessment: GameplayIntentRuntimeAssessment;
  readonly runtimeExperimentClassification?: {
    readonly definition: RuntimeExperimentDefinition;
    readonly bridge: RuntimeExperimentDiagnosticBridge;
  };
  readonly semanticIr?: SemanticIr;
  readonly classificationDiagnostics?:
    readonly DiagnosticFinding[];
  readonly defect: AiConfirmedDefectDraft;
  readonly repairContext?: ReportCandidateRepairContext;
}

export interface StaticReportCandidate {
  readonly route: "static";
  readonly bugTrigger?: BugTriggerDraft;
  readonly intent: GameplayIntentModel;
  readonly result: IntentDiagnosticGateResult;
  readonly semanticIr?: SemanticIr;
  readonly classificationDiagnostics?:
    readonly DiagnosticFinding[];
  readonly defect: AiConfirmedDefectDraft;
  readonly repairContext?: ReportCandidateRepairContext;
}

export interface TesterReportCandidate {
  readonly route: "tester";
  readonly subjectIds: readonly string[];
  readonly confirmation: TesterDefectConfirmationInput;
  readonly semanticIr?: SemanticIr;
  readonly classificationDiagnostics?:
    readonly DiagnosticFinding[];
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

function candidateExpectedBasis(
  candidate: AuditReportCandidate,
): ConfirmedDefect["expected"] {
  if (candidate.route === "tester") {
    return {
      authority:
        candidate.confirmation.expectedBehaviorAuthority,
      statement:
        candidate.confirmation.expectedStatement,
      evidenceIds: [
        ...new Set(
          candidate.confirmation.expectedEvidenceIds,
        ),
      ].sort(),
    };
  }

  const basisIds = new Set(
    candidate.route === "runtime"
      ? candidate.assessment.result.basisInvariantIds
      : candidate.result.basisInvariantIds,
  );
  const invariants = candidate.intent.invariants
    .filter((invariant) =>
      basisIds.has(invariant.id) &&
      invariant.status === "authored"
    );

  return {
    authority: "selected-artifact",
    statement: candidate.defect.expectedStatement,
    evidenceIds: [
      ...new Set(
        invariants.flatMap(
          (invariant) => invariant.evidenceIds,
        ),
      ),
    ].sort(),
  };
}

function candidateObservedBasis(
  candidate: AuditReportCandidate,
): ConfirmedDefect["observed"] {
  const evidenceIds =
    candidate.route === "runtime"
      ? [
          candidate.assessment.outcomeObservation.evidenceId,
          ...candidate.assessment.result.evidenceIds,
        ]
      : candidate.route === "static"
        ? candidate.result.evidenceIds
        : candidate.confirmation.observationEvidenceIds;

  return {
    statement: candidate.defect.observedStatement,
    evidenceIds: [
      ...new Set(
        evidenceIds.filter(
          (id) => id.trim().length > 0,
        ),
      ),
    ].sort(),
  };
}

function candidateEvidenceUniverse(
  candidate: AuditReportCandidate,
): readonly string[] {
  const expected = candidateExpectedBasis(candidate);
  const observed = candidateObservedBasis(candidate);
  const values = [
    ...expected.evidenceIds,
    ...observed.evidenceIds,
    ...(candidate.classificationDiagnostics ?? [])
      .map((finding) => finding.id),
  ];

  return [
    ...new Set(
      values.filter(
        (value) => value.trim().length > 0,
      ),
    ),
  ].sort();
}

function runtimeClassificationSignals(
  candidate: AuditReportCandidate,
) {
  if (
    candidate.route !== "runtime" ||
    candidate.runtimeExperimentClassification === undefined
  ) {
    return {
      impact: [],
      primaryFailure: [],
    } as const;
  }

  try {
    return deriveReportClassificationFromRuntimeExperiment(
      candidate.runtimeExperimentClassification.definition,
      candidate.runtimeExperimentClassification.bridge,
    );
  } catch {
    return {
      impact: [],
      primaryFailure: [],
    } as const;
  }
}

function candidateClassification(
  candidate: AuditReportCandidate,
) {
  const diagnosticSignals =
    derivePrimaryFailureSignalsFromDiagnostics(
      candidate.classificationDiagnostics ?? [],
    ).signals;
  const runtimeSignals =
    runtimeClassificationSignals(candidate);

  return deriveReportDefectClassification({
    impact: [
      ...candidate.defect.classificationSignals.impact,
      ...runtimeSignals.impact,
    ],
    primaryFailure: [
      ...candidate.defect.classificationSignals
        .primaryFailure,
      ...diagnosticSignals,
      ...runtimeSignals.primaryFailure,
    ],
  });
}

function classificationIssues(
  candidate: AuditReportCandidate,
): readonly string[] {
  const classification =
    candidateClassification(candidate);
  if (!classification.ok) {
    return classification.reasons;
  }

  const universe = new Set(
    candidateEvidenceUniverse(candidate),
  );
  const errors: string[] = [];

  for (const evidenceId of [
    ...classification.impactEvidenceIds,
    ...classification.primaryFailureEvidenceIds,
  ]) {
    if (!universe.has(evidenceId)) {
      errors.push(
        "Classification evidence is not part of the confirmed defect evidence universe: " +
          evidenceId +
          ".",
      );
    }
  }

  return [...new Set(errors)];
}

function runtimeClassificationIssues(
  candidate: AuditReportCandidate,
): readonly string[] {
  if (
    candidate.route !== "runtime" ||
    candidate.runtimeExperimentClassification === undefined
  ) {
    return [];
  }

  let derived;
  try {
    derived =
      deriveReportClassificationFromRuntimeExperiment(
        candidate.runtimeExperimentClassification.definition,
        candidate.runtimeExperimentClassification.bridge,
      );
  } catch (error) {
    return [
      error instanceof Error
        ? error.message
        : String(error),
    ];
  }

  const classificationEvidence = [
    ...derived.impact.flatMap(
      (signal) => signal.evidenceIds,
    ),
    ...derived.primaryFailure.flatMap(
      (signal) => signal.evidenceIds,
    ),
  ];
  if (classificationEvidence.length === 0) {
    return [];
  }

  const confirmationEvidence = new Set([
    candidate.assessment.outcomeObservation.evidenceId,
    ...candidate.assessment.result.evidenceIds,
  ]);

  if (
    !classificationEvidence.some(
      (id) => confirmationEvidence.has(id),
    )
  ) {
    return [
      "Runtime classification evidence is not part of the confirmation evidence for this defect.",
    ];
  }

  return [];
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

function preclassificationCandidateKey(
  candidate: AuditReportCandidate,
): string {
  const failures = [
    ...new Set(
      candidate.defect.classificationSignals
        .primaryFailure
        .map((signal) => signal.failure),
    ),
  ].sort();

  return [
    "candidate",
    "subjects=" +
      [...new Set(candidateSubjectIds(candidate))].sort().join(","),
    "invariants=" +
      [...new Set(candidateBrokenInvariantIds(candidate))].sort().join(","),
    "failures=" + failures.join(","),
    candidate.defect.causalIncidentId === undefined
      ? undefined
      : "incident=" + candidate.defect.causalIncidentId,
  ]
    .filter(
      (value): value is string =>
        value !== undefined,
    )
    .join("|");
}

function candidateSemanticKey(
  candidate: AuditReportCandidate,
): string {
  const classification =
    candidateClassification(candidate);

  if (!classification.ok) {
    return preclassificationCandidateKey(candidate);
  }

  return deriveConfirmedDefectSemanticKey({
    subjectIds: candidateSubjectIds(candidate),
    brokenInvariantIds:
      candidateBrokenInvariantIds(candidate),
    primaryFailure:
      classification.primaryFailure,
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
  return candidateEvidenceUniverse(candidate);
}

function routeNextEvidenceNeed(
  candidate: AuditReportCandidate,
): ReportCandidateNextEvidenceNeed {
  if (candidate.route === "runtime") {
    if (candidate.assessment.result.nextEvidenceNeed !== "none") {
      return candidate.assessment.result.nextEvidenceNeed;
    }
    return candidate.bugTrigger === undefined
      ? "tester-reproduction"
      : "none";
  }
  if (candidate.route === "static") {
    if (candidate.result.nextEvidenceNeed !== "none") {
      return candidate.result.nextEvidenceNeed;
    }
    return candidate.bugTrigger === undefined
      ? "tester-reproduction"
      : "none";
  }
  if (
    !candidate.confirmation.expectedStatement.trim() ||
    candidate.confirmation.expectedEvidenceIds.length === 0
  ) {
    return "expected-behavior-evidence";
  }
  if (
    !candidate.confirmation.reproduced ||
    candidate.confirmation.observationEvidenceIds.length === 0
  ) {
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

function aiBugTrigger(
  candidate: RuntimeReportCandidate | StaticReportCandidate,
): {
  readonly steps?: readonly string[];
  readonly issues: readonly string[];
} {
  if (candidate.bugTrigger === undefined) {
    return { issues: [] };
  }

  const compiled = compileBugTrigger(candidate.bugTrigger);
  if (!compiled.ok) {
    return {
      issues: compiled.issues.map(
        (issue) => issue.message,
      ),
    };
  }

  const universe = new Set(
    candidateEvidenceUniverse(candidate),
  );
  const unrelated = compiled.evidenceIds
    .filter((id) => !universe.has(id));

  if (unrelated.length > 0) {
    return {
      issues: [
        "Bug Trigger evidence is not part of the confirmed defect evidence universe: " +
          unrelated.join(", ") +
          ".",
      ],
    };
  }

  if (
    candidate.route === "static" &&
    compiled.gameplayBasis !== "authored-gameplay"
  ) {
    return {
      issues: [
        "Static AI Bug Trigger must be grounded in authored gameplay intent.",
      ],
    };
  }

  if (
    candidate.route === "runtime" &&
    compiled.gameplayBasis === "tester-gameplay"
  ) {
    return {
      issues: [
        "Runtime AI Bug Trigger cannot claim tester gameplay provenance.",
      ],
    };
  }

  const gameplayBasisEvidence =
    compiled.gameplayBasis === "authored-gameplay"
      ? new Set(
          candidateExpectedBasis(candidate).evidenceIds,
        )
      : new Set(
          candidateObservedBasis(candidate).evidenceIds,
        );

  if (
    !compiled.evidenceIds.some(
      (id) => gameplayBasisEvidence.has(id),
    )
  ) {
    return {
      issues: [
        "Bug Trigger gameplay basis is not supported by matching gameplay evidence from the same defect.",
      ],
    };
  }

  return {
    steps: compiled.steps,
    issues: [],
  };
}

function collectOne(
  candidate: AuditReportCandidate,
): {
  readonly confirmed?: ConfirmedDefect;
  readonly rejected?: RejectedReportCandidate;
} {
  const runtimeClassificationProblems =
    runtimeClassificationIssues(candidate);
  if (runtimeClassificationProblems.length > 0) {
    return {
      rejected: rejectedCandidate(
        candidate,
        runtimeClassificationProblems,
        "candidate-correction",
      ),
    };
  }

  const classificationProblems =
    classificationIssues(candidate);
  if (classificationProblems.length > 0) {
    return {
      rejected: rejectedCandidate(
        candidate,
        classificationProblems,
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

  const trigger: {
    readonly steps?: readonly string[];
    readonly issues: readonly string[];
  } =
    candidate.route === "tester"
      ? { issues: [] }
      : aiBugTrigger(candidate);
  if (trigger.issues.length > 0) {
    return {
      rejected: rejectedCandidate(
        candidate,
        trigger.issues,
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

  const classification =
    candidateClassification(candidate);
  if (!classification.ok) {
    return {
      rejected: rejectedCandidate(
        candidate,
        classification.reasons,
        "candidate-correction",
      ),
    };
  }

  const boundSourceEvidence =
    candidateSourceEvidence(candidate);
  const expected =
    candidateExpectedBasis(candidate);
  const observed =
    candidateObservedBasis(candidate);
  const {
    classificationSignals:
      _classificationSignals,
    expectedStatement:
      _expectedStatement,
    observedStatement:
      _observedStatement,
    reproduction:
      rawReproduction,
    ...defectDraft
  } = candidate.defect;

  const confirmed: ConfirmedDefect = {
    ...defectDraft,
    expected,
    observed,
    impact: classification.impact,
    primaryFailure:
      classification.primaryFailure,
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
    ...(candidate.route === "tester"
      ? rawReproduction === undefined
        ? {}
        : { reproduction: rawReproduction }
      : trigger.steps === undefined
        ? {}
        : { reproduction: trigger.steps }),
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

function applyEngineeringAnalysis(
  defect: ConfirmedDefect,
  analyses:
    readonly InspectionEngineeringAnalysis[],
): ConfirmedDefect {
  const matching = analyses.find((item) =>
    item.domain === "arena-capacity" &&
    defect.primaryFailure ===
      "session-concurrency"
  );

  if (!matching) return defect;

  const rendered =
    renderEngineeringAnalysis(
      matching.analysis,
    );

  return {
    ...defect,
    engineeringAnalysis:
      defect.engineeringAnalysis === undefined
        ? rendered
        : [
            defect.engineeringAnalysis,
            rendered,
          ].join("\n\n"),
  };
}

export function collectConfirmedDefects(
  candidates: readonly AuditReportCandidate[],
  engineeringAnalyses:
    readonly InspectionEngineeringAnalysis[] = [],
): ConfirmedDefectCollection {
  const confirmed: ConfirmedDefect[] = [];
  const rejected: RejectedReportCandidate[] = [];

  for (const candidate of candidates) {
    const result = collectOne(candidate);
    if (result.confirmed) {
      confirmed.push(
        applyEngineeringAnalysis(
          result.confirmed,
          engineeringAnalyses,
        ),
      );
    }
    if (result.rejected) rejected.push(result.rejected);
  }

  return { confirmed, rejected };
}

export interface BuildBugReportFromAuditInput {
  readonly map: BugReportV2Map;
  readonly repairBy: BugReportV2RepairBy;
  readonly approved: ApprovedBugSet;
  readonly files: readonly FileInventoryEntry[];
  readonly candidates: readonly AuditReportCandidate[];
  readonly engineeringAnalyses?:
    readonly InspectionEngineeringAnalysis[];
  readonly groupResolutions?:
    readonly ConfirmedDefectGroupResolution[];
}

export interface PrepareBugReportReviewFromAuditResult {
  readonly collection: ConfirmedDefectCollection;
  readonly proposed: ProposedBugSet;
}

export interface BuildBugReportFromAuditResult {
  readonly collection: ConfirmedDefectCollection;
  readonly promotion: PromoteConfirmedBugsResult;
}

export interface BuildBugReportFromClosedAuditInput
  extends BuildBugReportFromAuditInput {
  readonly gameplayClosure: GameplayModelClosureResult;
}

export function gameplayClosurePublicationIssues(
  closure: GameplayModelClosureResult,
): readonly {
  code: "invalid-confirmed-defect";
  message: string;
}[] {
  if (closure.status !== "OPEN") return [];

  return [{
    code: "invalid-confirmed-defect",
    message:
      "Gameplay Model Closure is OPEN. Comprehensive Bug Report publication is blocked until discovered gameplay surfaces and the major state model are accounted for.",
  }];
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

export function prepareBugReportReviewFromAuditCandidates(
  input: Omit<
    BuildBugReportFromAuditInput,
    "repairBy" | "approved"
  >,
): PrepareBugReportReviewFromAuditResult {
  const collection = collectConfirmedDefects(
    input.candidates,
    input.engineeringAnalyses ?? [],
  );

  return {
    collection,
    proposed: projectProposedBugSet(
      input.map,
      collection.confirmed,
    ),
  };
}

/**
 * Low-level compatibility route.
 * Production map audits must use buildBugReportFromAuditCandidates()
 * with Gameplay Model Closure.
 */
export function buildBugReportFromAuditCandidatesCompatibility(
  input: BuildBugReportFromAuditInput,
): BuildBugReportFromAuditResult {
  const collection = collectConfirmedDefects(
    input.candidates,
  );
  const sourceIssues = sourceEvidenceIssues(
    collection.confirmed,
    input.files,
  );

  if (
    input.approved.map.name !== input.map.name ||
    input.approved.map.mapVersion !== input.map.mapVersion
  ) {
    return {
      collection,
      promotion: {
        ok: false,
        issues: [{
          code: "invalid-confirmed-defect",
          message:
            "Approved Bug Set does not match the audited map/version.",
        }],
      },
    };
  }

  return {
    collection,
    promotion:
      sourceIssues.length > 0
        ? {
            ok: false,
            issues: sourceIssues,
          }
        : buildBugReportFromApprovedBugSet({
            approved: input.approved,
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


export function buildBugReportFromAuditCandidates(
  input: BuildBugReportFromClosedAuditInput,
): BuildBugReportFromAuditResult {
  const closureIssues =
    gameplayClosurePublicationIssues(
      input.gameplayClosure,
    );

  if (closureIssues.length > 0) {
    return {
      collection: collectConfirmedDefects(
        input.candidates,
        input.engineeringAnalyses ?? [],
      ),
      promotion: {
        ok: false,
        issues: closureIssues,
      },
    };
  }

  return buildBugReportFromAuditCandidatesCompatibility(
    input,
  );
}

export const buildBugReportFromClosedAuditCandidates =
  buildBugReportFromAuditCandidates;
