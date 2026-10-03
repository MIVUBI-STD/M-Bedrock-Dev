import {
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import {
  join,
  resolve,
} from "node:path";
import {
  parseBugReportV2Json,
  projectBugReportClientDocument,
  reviewBugReportClientDocument,
} from "../../engine/packages/bug-report/src/index.js";
import type {
  BugReportClientDocument,
  BugReportClientIssue,
} from "../../engine/packages/bug-report/src/document/model.js";

interface Args {
  readonly input: string;
  readonly outDir: string;
  readonly includeFixed: boolean;
  readonly includeMinor: boolean;
}

interface MapAuditHtmlFinding {
  readonly id: string;
  readonly status: "PROVEN" | "NEED_VALIDATION";
  readonly issueType: "BUG" | "DESIGN_MISMATCH";
  readonly failureDomain: string;
  readonly gameplayFlow: string;
  readonly severity?: "Blocker" | "Major" | "Minor";
  readonly issue: string;
  readonly playerImpact?: string;
  readonly reproduceSteps: readonly string[];
  readonly expected: string;
  readonly actual: string;
  readonly proofCeiling:
    | "PROVEN"
    | "NEEDS_DECIDING_PROOF";
  readonly evidenceIds?: readonly string[];
  readonly validationReason?: string;
  readonly missingProof?: string;
  readonly validationTest?: string;
  readonly proofNavigation?: {
    readonly proofGoal: string;
    readonly provenClaims: readonly string[];
    readonly missingClaims: readonly string[];
    readonly route: readonly {
      readonly order: number;
      readonly knowledgeDomain: string;
      readonly question: string;
      readonly purpose: string;
      readonly evidencePreference:
        | "selected-artifact"
        | "cross-domain"
        | "formal"
        | "runtime";
    }[];
    readonly evidenceSubstitutions: readonly {
      readonly id: string;
      readonly replaces: string;
      readonly requiredEvidence: readonly string[];
      readonly applicableBecause: readonly string[];
      readonly decisionRule: string;
    }[];
    readonly historicalSearchHints: readonly {
      readonly question: string;
    }[];
    readonly familyProofCriteria: readonly string[];
    readonly runtimeLastResort: boolean;
  };
}

interface MapAuditHtmlInput {
  readonly schemaVersion: 2;
  readonly artifactId: string;
  readonly mapVersion: string;
  readonly control?: {
    readonly status: "READY_FOR_REVIEW" | "BLOCKED";
    readonly currentStage: string;
    readonly allowedNextAction: string;
    readonly continuationOwner: string;
    readonly requiresNewAuditRun: boolean;
    readonly blockingCheckpointIds: readonly string[];
    readonly reasons: readonly string[];
  };
  readonly evidenceScope: {
    readonly selectedArtifact: string;
  };
  readonly gameDesign?: {
    readonly objective: string;
    readonly winCondition: string;
    readonly loseCondition: string;
  };
  readonly multiArena?: {
    readonly detected: boolean;
    readonly visibleArenaCount: number | null;
    readonly declaredConcurrentArenaLimit: number | null;
    readonly safeConcurrentArenaLimit: number | null;
    readonly queueBehavior: string;
    readonly isolationRules: readonly string[];
  };
  readonly gameplayClosure?: {
    readonly status: "CLOSED" | "PARTIAL" | "OPEN";
    readonly stateModelComplete: boolean;
    readonly boundariesExtracted: boolean;
    readonly unaccountedSurfaceIds: readonly string[];
    readonly notes: string;
  };
  readonly honesty?: {
    readonly status: "PASS" | "VIOLATION";
    readonly missingVisibleResidueIds: readonly string[];
    readonly missingProvenProjectionIds: readonly string[];
    readonly reasons: readonly string[];
  };
  readonly fullMapReplica?: {
    readonly replicaBaseline: string;
    readonly replicaDivergenceIds: readonly string[];
    readonly incompleteReplicaIds: readonly string[];
    readonly baselineReusableForAllReplicas: boolean;
  };
  readonly bugs: readonly MapAuditHtmlFinding[];
  readonly designMismatches: readonly MapAuditHtmlFinding[];
  readonly validationTests?: readonly {
    readonly key: string;
    readonly findingIds: readonly string[];
    readonly test: string;
    readonly missingProof?: readonly string[];
    readonly assertions?: readonly {
      readonly findingId: string;
      readonly test: string;
    }[];
  }[];
}

function isMapAuditHtmlInput(
  value: unknown,
): value is MapAuditHtmlInput {
  if (
    value === null ||
    typeof value !== "object"
  ) {
    return false;
  }
  const record =
    value as Record<string, unknown>;
  return (
    record.schemaVersion === 2 &&
    typeof record.artifactId === "string" &&
    typeof record.mapVersion === "string" &&
    Array.isArray(record.bugs) &&
    Array.isArray(record.designMismatches)
  );
}

function mapAuditHtmlInputIssues(
  audit: MapAuditHtmlInput,
): readonly string[] {
  const issues: string[] = [];
  const findings = [
    ...audit.bugs,
    ...audit.designMismatches,
  ];

  for (const finding of findings) {
    if (
      !finding.id?.trim() ||
      !finding.issue?.trim() ||
      !finding.expected?.trim() ||
      !finding.actual?.trim() ||
      !finding.failureDomain?.trim() ||
      !finding.gameplayFlow?.trim()
    ) {
      issues.push(
        "Map Audit finding is missing required reader-facing fields: " +
          (finding.id || "<missing-id>") +
          ".",
      );
    }
    if (
      finding.status === "NEED_VALIDATION" &&
      (
        !finding.validationReason?.trim() ||
        !finding.missingProof?.trim() ||
        !finding.validationTest?.trim()
      )
    ) {
      issues.push(
        "NEED_VALIDATION finding requires validationReason, missingProof, and validationTest: " +
          finding.id +
          ".",
      );
    }
  }

  return issues;
}

function parseArgs(argv: readonly string[]): Args {
  let input = "";
  let outDir = "";
  let includeFixed = false;
  let includeMinor = false;

  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === "--input") {
      input = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (value === "--out") {
      outDir = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (value === "--include-fixed") {
      includeFixed = true;
      continue;
    }
    if (value === "--include-minor") {
      includeMinor = true;
      continue;
    }
    throw new Error("Unknown argument: " + value);
  }

  if (!input) {
    throw new Error(
      "Missing --input <Map Audit Output V2 or Approved Bug Report V2 JSON>.",
    );
  }
  if (!outDir) {
    throw new Error(
      "Missing --out <output directory>.",
    );
  }

  return {
    input: resolve(input),
    outDir: resolve(outDir),
    includeFixed,
    includeMinor,
  };
}

function safeSegment(value: string): string {
  const cleaned = value
    .trim()
    .replace(/[^a-zA-Z0-9._ -]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "Map";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function severityLabel(
  severity: BugReportClientIssue["severity"],
): string {
  if (severity === "blocker") return "BLOCKER";
  if (severity === "major") return "MAJOR";
  return "MINOR";
}

function checklist(
  items: readonly string[],
  className = "checklist",
): string {
  return [
    '<ul class="' + className + '">',
    ...items.map(
      (item) =>
        '  <li><label><input type="checkbox"> <span>' +
        escapeHtml(item) +
        '</span></label></li>',
    ),
    "</ul>",
  ].join("\n");
}

function orderedSteps(
  items: readonly string[],
): string {
  return [
    '<ol class="steps">',
    ...items.map(
      (item) =>
        '  <li>' + escapeHtml(item) + '</li>',
    ),
    "</ol>",
  ].join("\n");
}

function issueCard(issue: BugReportClientIssue): string {
  const detailRows = [
    '<div class="row"><div class="label">Issue</div><div class="value">' +
      escapeHtml(issue.issue) +
      "</div></div>",
    '<div class="row"><div class="label">How to Reproduce</div><div class="value">' +
      orderedSteps(issue.reproduction) +
      "</div></div>",
    '<div class="row"><div class="label">Observed</div><div class="value">' +
      escapeHtml(issue.observed) +
      "</div></div>",
    '<div class="row"><div class="label">Expected</div><div class="value">' +
      escapeHtml(issue.expected) +
      "</div></div>",
  ];

  if (issue.recommendedResolution) {
    detailRows.push(
      '<div class="row"><div class="label">Resolution</div><div class="value">' +
        escapeHtml(issue.recommendedResolution) +
        "</div></div>",
    );
  }

  if (
    issue.technicalAnalysis ||
    issue.relevantCode?.length ||
    issue.mustPreserve?.length
  ) {
    const technicalParts: string[] = [];
    if (issue.technicalAnalysis) {
      technicalParts.push(
        '<div class="technical-text">' +
          escapeHtml(issue.technicalAnalysis) +
          "</div>",
      );
    }
    if (issue.relevantCode?.length) {
      technicalParts.push(
        '<div class="technical-sub"><strong>Relevant Code</strong><ul>' +
        issue.relevantCode.map(
          (item) =>
            '<li><code>' +
            escapeHtml(item.file) +
            "</code> — " +
            escapeHtml(item.reason) +
            "</li>",
        ).join("") +
        "</ul></div>",
      );
    }
    if (issue.mustPreserve?.length) {
      technicalParts.push(
        '<div class="technical-sub"><strong>Must Preserve</strong><ul>' +
        issue.mustPreserve.map(
          (item) =>
            "<li>" + escapeHtml(item) + "</li>",
        ).join("") +
        "</ul></div>",
      );
    }
    detailRows.push(
      '<div class="technical-row"><details class="technical"><summary>Technical Detail</summary>' +
      technicalParts.join("") +
      "</details></div>",
    );
  }

  return [
    '<article class="bug-row severity-' + issue.severity + '">',
    '  <div class="bug-check"><label><input type="checkbox"' +
      (issue.status === "fixed" ? " checked" : "") +
      ' aria-label="Verified fixed: ' +
      escapeHtml(issue.title) +
      '"><span>Fixed</span></label></div>',
    '  <details class="bug-details">',
    '    <summary>',
    '      <div class="bug-summary-number">' +
      String(issue.number).padStart(2, "0") +
      "</div>",
    '      <div class="severity">' +
      severityLabel(issue.severity) +
      "</div>",
    '      <div class="bug-summary-main">',
    '        <strong>' +
      escapeHtml(issue.title) +
      "</strong>",
    '        <span class="bug-summary-meta">' +
      escapeHtml(issue.category) +
      " · " +
      escapeHtml(issue.id) +
      "</span>",
    "      </div>",
    '      <span class="details-label"><span class="when-closed">See details</span><span class="when-open">Hide details</span></span>',
    "    </summary>",
    '    <div class="bug-detail-body">',
    ...detailRows.map((row) => "      " + row),
    "    </div>",
    "  </details>",
    "</article>",
  ].join("\n");
}

function auditStatusLabel(
  finding: MapAuditHtmlFinding,
): string {
  return finding.status === "PROVEN"
    ? "PROVEN"
    : "NEED VALIDATION";
}

function auditFindingCard(
  finding: MapAuditHtmlFinding,
): string {
  const severity =
    finding.status === "PROVEN"
      ? finding.severity ?? "—"
      : "UNPROVEN";
  const validationRows =
    finding.status === "NEED_VALIDATION"
      ? [
          '<div class="row"><div class="label">Why Unproven</div><div class="value">' +
            escapeHtml(
              finding.validationReason ??
                "Deciding proof remains unresolved.",
            ) +
            "</div></div>",
          '<div class="row"><div class="label">Missing Proof</div><div class="value">' +
            escapeHtml(
              finding.missingProof ??
                "Exact deciding proof is not yet available.",
            ) +
            "</div></div>",
          ...(finding.proofNavigation
            ? [
                '<div class="technical-row"><details class="technical proof-guide"><summary>Proof Guidance</summary>' +
                  '<div class="proof-goal"><strong>Goal</strong><p>' +
                  escapeHtml(finding.proofNavigation.proofGoal) +
                  '</p></div>' +
                  (finding.proofNavigation.missingClaims.length > 0
                    ? '<div class="technical-sub"><strong>Missing Claims</strong><ul>' +
                      finding.proofNavigation.missingClaims.map(
                        (item) => '<li>' + escapeHtml(item) + '</li>',
                      ).join("") +
                      '</ul></div>'
                    : '') +
                  '<div class="technical-sub"><strong>Proof Route</strong><ol>' +
                  finding.proofNavigation.route.map(
                    (step) =>
                      '<li><strong>' +
                      escapeHtml(step.knowledgeDomain) +
                      '</strong> — ' +
                      escapeHtml(step.question) +
                      ' <span class="proof-pref">[' +
                      escapeHtml(step.evidencePreference) +
                      ']</span></li>',
                  ).join("") +
                  '</ol></div>' +
                  (finding.proofNavigation.familyProofCriteria.length > 0
                    ? '<div class="technical-sub"><strong>Family Proof Criteria</strong><ul>' +
                      finding.proofNavigation.familyProofCriteria.map(
                        (item) =>
                          '<li>' + escapeHtml(item) + '</li>',
                      ).join("") +
                      '</ul></div>'
                    : '') +
                  (finding.proofNavigation.historicalSearchHints.length > 0
                    ? '<div class="technical-sub"><strong>Historical Search Hints</strong><ul>' +
                      finding.proofNavigation.historicalSearchHints.map(
                        (item) =>
                          '<li>' + escapeHtml(item.question) + '</li>',
                      ).join("") +
                      '</ul></div>'
                    : '') +
                  (finding.proofNavigation.evidenceSubstitutions.length > 0
                    ? '<div class="technical-sub"><strong>Evidence Substitution</strong><ul>' +
                      finding.proofNavigation.evidenceSubstitutions.map(
                        (item) =>
                          '<li>' +
                          escapeHtml(item.replaces) +
                          ' → ' +
                          escapeHtml(item.decisionRule) +
                          '</li>',
                      ).join("") +
                      '</ul></div>'
                    : '') +
                  (finding.proofNavigation.runtimeLastResort
                    ? '<div class="proof-note">Runtime is last resort after applicable static, cross-domain, or formal proof routes are exhausted.</div>'
                    : '') +
                  '</details></div>',
              ]
            : []),
        ]
      : [];

  return [
    '<article class="issue-card audit-status-' +
      finding.status.toLowerCase().replace("_", "-") +
      '">',
    '  <header class="issue-head">',
    '    <div class="issue-number">•</div>',
    '    <div class="severity">' +
      escapeHtml(auditStatusLabel(finding)) +
      "</div>",
    '    <div class="issue-title"><h2>' +
      escapeHtml(finding.issue) +
      "</h2>",
    '      <div class="meta-line"><span>' +
      escapeHtml(finding.id) +
      "</span><span>" +
      escapeHtml(finding.issueType) +
      "</span><span>" +
      escapeHtml(severity) +
      "</span></div>",
    "    </div>",
    "  </header>",
    '  <div class="issue-body">',
    '<div class="row"><div class="label">How to Reproduce</div><div class="value">' +
      orderedSteps(finding.reproduceSteps) +
      "</div></div>",
    '<div class="row"><div class="label">Observed</div><div class="value">' +
      escapeHtml(finding.actual) +
      "</div></div>",
    '<div class="row"><div class="label">Expected</div><div class="value">' +
      escapeHtml(finding.expected) +
      "</div></div>",
    ...(finding.playerImpact
      ? [
          '<div class="row"><div class="label">Player Impact</div><div class="value">' +
            escapeHtml(finding.playerImpact) +
            "</div></div>",
        ]
      : []),
    ...validationRows,
    '<div class="technical-row"><details class="technical"><summary>Technical Evidence</summary><div class="technical-text">' +
      escapeHtml(
        "Gameplay Flow: " +
          finding.gameplayFlow +
          "\nFailure Domain: " +
          finding.failureDomain +
          "\nProof Ceiling: " +
          finding.proofCeiling +
          (finding.evidenceIds?.length
            ? "\nEvidence: " +
              finding.evidenceIds.join(", ")
            : ""),
      ) +
      "</div></details></div>",
    "  </div>",
    "</article>",
  ].join("\n");
}

function auditValidationPlan(
  audit: MapAuditHtmlInput,
): string {
  const groups = audit.validationTests ?? [];
  if (groups.length === 0) return "";

  return [
    '<section class="section">',
    '<h2>Validation Plan</h2>',
    '<div class="note">Run only the unresolved proof groups below. Shared setup may be reused, but every exact assertion remains independent.</div>',
    ...groups.map((group) => {
      const assertions =
        group.assertions?.length
          ? checklist(
              group.assertions.map(
                (item) =>
                  item.findingId + " — " + item.test,
              ),
            )
          : checklist([group.test]);
      return [
        '<article class="issue-card">',
        '<div class="row"><div class="label">Group</div><div class="value"><strong>' +
          escapeHtml(group.key) +
          '</strong><br>' +
          escapeHtml(group.test) +
          '</div></div>',
        ...(group.missingProof?.length
          ? [
              '<div class="row"><div class="label">Missing Proof</div><div class="value">' +
                checklist(group.missingProof) +
                '</div></div>',
            ]
          : []),
        '<div class="row"><div class="label">Exact Assertions</div><div class="value">' +
          assertions +
          '</div></div>',
        '</article>',
      ].join("");
    }),
    '</section>',
  ].join("\n");
}

function auditControlSummary(
  audit: MapAuditHtmlInput,
): string {
  const control = audit.control;
  if (!control) return "";

  const blockers =
    control.blockingCheckpointIds.length > 0
      ? control.blockingCheckpointIds.join(", ")
      : "None";

  const reasons =
    control.reasons.length > 0
      ? '<ul>' +
        control.reasons.map(
          (item) =>
            '<li>' + escapeHtml(item) + '</li>',
        ).join("") +
        '</ul>'
      : '<span>None</span>';

  return [
    '<section class="section control-summary">',
    '<h2>Current Audit Action</h2>',
    '<div class="control-grid">',
    '<div><span>Status</span><strong>' +
      escapeHtml(control.status) +
      '</strong></div>',
    '<div><span>Stage</span><strong>' +
      escapeHtml(control.currentStage) +
      '</strong></div>',
    '<div><span>Next Action</span><strong>' +
      escapeHtml(control.allowedNextAction) +
      '</strong></div>',
    '<div><span>Owner</span><strong>' +
      escapeHtml(control.continuationOwner) +
      '</strong></div>',
    '</div>',
    '<div class="row"><div class="label">Blocking Checkpoints</div><div class="value">' +
      escapeHtml(blockers) +
      '</div></div>',
    ...(control.reasons.length > 0
      ? [
          '<div class="row"><div class="label">Why</div><div class="value">' +
            reasons +
            '</div></div>',
        ]
      : []),
    '</section>',
  ].join("\n");
}

function auditContextSummary(
  audit: MapAuditHtmlInput,
): string {
  const hasContext =
    audit.gameDesign !== undefined ||
    audit.multiArena !== undefined ||
    audit.gameplayClosure !== undefined ||
    audit.honesty !== undefined ||
    audit.fullMapReplica !== undefined;

  if (!hasContext) return "";

  const design = audit.gameDesign;
  const arenas = audit.multiArena;
  const closure = audit.gameplayClosure;
  const honesty = audit.honesty;
  const replica = audit.fullMapReplica;

  const rows: string[] = [];

  if (design) {
    rows.push(
      '<div class="row"><div class="label">Game Design</div><div class="value">' +
        '<strong>Objective:</strong> ' +
        escapeHtml(design.objective) +
        '<br><strong>Win:</strong> ' +
        escapeHtml(design.winCondition) +
        '<br><strong>Lose:</strong> ' +
        escapeHtml(design.loseCondition) +
        '</div></div>',
    );
  }

  if (arenas) {
    rows.push(
      '<div class="row"><div class="label">Multi-Arena</div><div class="value">' +
        '<strong>Detected:</strong> ' +
        escapeHtml(String(arenas.detected)) +
        '<br><strong>Visible Arenas:</strong> ' +
        escapeHtml(
          arenas.visibleArenaCount === null
            ? "Unresolved"
            : String(arenas.visibleArenaCount),
        ) +
        '<br><strong>Declared Concurrent:</strong> ' +
        escapeHtml(
          arenas.declaredConcurrentArenaLimit === null
            ? "Unresolved"
            : String(arenas.declaredConcurrentArenaLimit),
        ) +
        '<br><strong>Proven Safe Concurrent:</strong> ' +
        escapeHtml(
          arenas.safeConcurrentArenaLimit === null
            ? "Not proven"
            : String(arenas.safeConcurrentArenaLimit),
        ) +
        '</div></div>',
    );
  }

  if (closure) {
    rows.push(
      '<div class="row"><div class="label">Gameplay Closure</div><div class="value">' +
        '<strong>Status:</strong> ' +
        escapeHtml(closure.status) +
        '<br><strong>State Model:</strong> ' +
        escapeHtml(
          closure.stateModelComplete
            ? "Complete"
            : "Incomplete",
        ) +
        '<br><strong>Boundaries:</strong> ' +
        escapeHtml(
          closure.boundariesExtracted
            ? "Extracted"
            : "Incomplete",
        ) +
        '<br><strong>Unaccounted Surfaces:</strong> ' +
        escapeHtml(
          String(closure.unaccountedSurfaceIds.length),
        ) +
        '</div></div>',
    );
  }

  if (honesty) {
    rows.push(
      '<div class="row"><div class="label">Honesty Gate</div><div class="value">' +
        '<strong>Status:</strong> ' +
        escapeHtml(honesty.status) +
        '<br><strong>Missing Residue:</strong> ' +
        escapeHtml(
          String(honesty.missingVisibleResidueIds.length),
        ) +
        '<br><strong>Missing Proven Projection:</strong> ' +
        escapeHtml(
          String(honesty.missingProvenProjectionIds.length),
        ) +
        '</div></div>',
    );
  }

  if (replica) {
    rows.push(
      '<div class="row"><div class="label">Replica Proof</div><div class="value">' +
        '<strong>Baseline:</strong> ' +
        escapeHtml(replica.replicaBaseline) +
        '<br><strong>Reusable for All:</strong> ' +
        escapeHtml(
          String(replica.baselineReusableForAllReplicas),
        ) +
        '<br><strong>Divergence:</strong> ' +
        escapeHtml(
          String(replica.replicaDivergenceIds.length),
        ) +
        '<br><strong>Incomplete:</strong> ' +
        escapeHtml(
          String(replica.incompleteReplicaIds.length),
        ) +
        '</div></div>',
    );
  }

  return [
    '<section class="section audit-context">',
    '<details>',
    '<summary>Audit Context</summary>',
    '<div class="audit-context-body">',
    ...rows,
    '</div>',
    '</details>',
    '</section>',
  ].join("\n");
}

function renderCompleteMapAuditHtml(
  audit: MapAuditHtmlInput,
): string {
  const findings = [
    ...audit.bugs,
    ...audit.designMismatches,
  ];
  const proven =
    findings.filter(
      (item) => item.status === "PROVEN",
    );
  const needValidation =
    findings.filter(
      (item) =>
        item.status === "NEED_VALIDATION",
    );
  const artifactLabel =
    audit.evidenceScope?.selectedArtifact ||
    audit.artifactId;

  const baseCss = `
body{margin:0;background:#eef1f5;color:#172033;font:15px/1.45 Arial,Helvetica,sans-serif}
.report{width:min(1060px,calc(100% - 28px));margin:24px auto;background:#fff;border:1px solid #d9dee8;border-radius:14px;overflow:hidden}
.hero{padding:28px 32px;background:#172b4d;color:#fff}.hero h1{margin:0 0 6px}.hero p{margin:0;opacity:.8}
.metrics{display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid #d9dee8}
.metric{padding:16px 20px;border-right:1px solid #d9dee8}.metric:last-child{border-right:0}.metric span{display:block;color:#667085;font-size:11px;font-weight:700;text-transform:uppercase}.metric strong{font-size:18px}
.section{padding:24px}.section h2{margin:0 0 14px}.note{padding:14px 18px;background:#fff8e6;border:1px solid #eed28a;border-radius:8px;margin-bottom:18px}.control-summary{border-bottom:1px solid #d9dee8;background:#fbfcfe}.control-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px}.control-grid div{padding:12px 14px;border:1px solid #d9dee8;border-radius:8px;background:#fff}.control-grid span{display:block;color:#667085;font-size:10px;font-weight:800;text-transform:uppercase}.control-grid strong{display:block;margin-top:3px;font-size:13px}.audit-context{padding-top:16px;padding-bottom:16px;border-bottom:1px solid #d9dee8}.audit-context>details>summary{cursor:pointer;color:#3157a4;font-size:12px;font-weight:800}.audit-context-body{margin-top:12px;border:1px solid #d9dee8;border-radius:8px;overflow:hidden}
.issue-card{margin:0 0 18px;border:1px solid #d9dee8;border-radius:10px;overflow:hidden}.issue-head{display:grid;grid-template-columns:36px 130px 1fr;align-items:center;background:#f8fafc;border-bottom:1px solid #d9dee8}.issue-number,.severity{padding:10px 12px;font-size:12px;font-weight:800}.issue-title{padding:10px 14px 10px 0}.issue-title h2{margin:0;font-size:16px}.meta-line{display:flex;flex-wrap:wrap;gap:8px;margin-top:5px;color:#667085;font-size:10px;font-weight:700;text-transform:uppercase}
.audit-status-proven .severity{color:#166534}.audit-status-need-validation .severity{color:#9a6700}
.row{display:grid;grid-template-columns:150px minmax(0,1fr);border-bottom:1px solid #d9dee8}.label{padding:13px 15px;background:#f8fafc;color:#3157a4;font-size:12px;font-weight:800}.value{padding:13px 16px}.checklist{list-style:none;margin:0;padding:0}.checklist li+li{margin-top:7px}.technical-row{padding:12px 16px;background:#fcfcfd;border-top:1px solid #d9dee8}.technical summary{cursor:pointer;color:#3157a4;font-size:12px;font-weight:800}.technical-text{margin-top:9px;white-space:pre-wrap;font:12px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;color:#667085}.proof-goal p{margin:5px 0 0}.proof-guide ol,.proof-guide ul{margin:6px 0 0;padding-left:20px}.proof-pref{color:#667085;font-size:11px}.proof-note{margin-top:12px;padding:9px 11px;background:#fff8e6;border-radius:6px;color:#765d16;font-size:12px}
@media(max-width:700px){.report{width:100%;margin:0;border-radius:0}.metrics{grid-template-columns:1fr}.control-grid{grid-template-columns:1fr 1fr}.row{grid-template-columns:1fr}}
@media print{body{background:#fff}.report{width:100%;margin:0;border:0}.issue-card{break-inside:avoid-page}.technical{display:block}.technical summary{list-style:none}.technical>*{display:block!important}input[type="checkbox"]{appearance:none;width:11px;height:11px;border:1px solid #555;vertical-align:middle}}
`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(artifactLabel)} — Map Audit Report</title>
<style>${baseCss}</style>
</head>
<body>
<main class="report">
  <section class="hero">
    <h1>${escapeHtml(artifactLabel)} — Map Audit Report</h1>
    <p>Map version ${escapeHtml(audit.mapVersion)} · selected-artifact audit</p>
  </section>
  <section class="metrics">
    <div class="metric"><span>Total Findings</span><strong>${findings.length}</strong></div>
    <div class="metric"><span>Proven</span><strong>${proven.length}</strong></div>
    <div class="metric"><span>Need Validation</span><strong>${needValidation.length}</strong></div>
  </section>
  ${auditControlSummary(audit)}
  ${auditContextSummary(audit)}
  <section class="section">
    <div class="note"><strong>Validation status:</strong> NEED VALIDATION identifies a material finding that still requires deciding proof. It remains listed until confirmed or disproved, and no final severity is assigned while unresolved.</div>
    <h2>PROVEN</h2>
    ${proven.length > 0 ? proven.map(auditFindingCard).join("\n") : "<p>No proven findings.</p>"}
  </section>
  <section class="section">
    <h2>NEED VALIDATION / UNPROVEN</h2>
    ${needValidation.length > 0 ? needValidation.map(auditFindingCard).join("\n") : "<p>No unresolved material findings.</p>"}
  </section>
  ${auditValidationPlan(audit)}
</main>
</body>
</html>`;
}

function renderHtml(
  document: BugReportClientDocument,
): string {
  const severitySummary = [
    document.summary.blocker > 0
      ? document.summary.blocker + " Blocker"
      : null,
    document.summary.major > 0
      ? document.summary.major + " Major"
      : null,
    document.summary.minor > 0
      ? document.summary.minor + " Minor"
      : null,
  ].filter(Boolean).join(" · ");

  const cards =
    document.issues.length === 0
      ? '<section class="empty">No gameplay-blocking or materially disruptive open issues are recorded.</section>'
      : document.issues.map(issueCard).join("\n\n");

  const severityLegend =
    document.issues.length > 0
      ? [
          '<section class="legend compact-legend">',
          '<details>',
          '<summary>Severity Guide</summary>',
          '<div class="legend-grid">',
          ...document.severityLegend.map(
            (item) =>
              '<div><strong>' +
              escapeHtml(item.label) +
              '</strong><span>' +
              escapeHtml(item.meaning) +
              '</span></div>',
          ),
          '</div>',
          '</details>',
          '</section>',
        ].join("\n")
      : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(document.title)}</title>
<style>
:root {
  color-scheme: light;
  --ink:#172033;
  --muted:#667085;
  --line:#d9dee8;
  --navy:#172b4d;
  --blue:#3157a4;
  --soft:#f5f7fa;
  --blocker:#9f1d20;
  --major:#a05a00;
}
* { box-sizing:border-box; }
body {
  margin:0;
  background:#eef1f5;
  color:var(--ink);
  font:15px/1.45 Arial, Helvetica, sans-serif;
}
.report {
  width:min(1060px, calc(100% - 28px));
  margin:24px auto;
  background:#fff;
  border:1px solid var(--line);
  border-radius:14px;
  overflow:hidden;
  box-shadow:0 8px 28px rgba(23,32,51,.08);
}
.hero {
  padding:28px 32px 24px;
  background:var(--navy);
  color:#fff;
}
.brand {
  font-size:12px;
  letter-spacing:.16em;
  font-weight:700;
  opacity:.78;
}
.hero h1 {
  margin:8px 0 4px;
  font-size:28px;
  line-height:1.15;
}
.subtitle {
  margin:0;
  opacity:.8;
}
.metrics {
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  border-bottom:1px solid var(--line);
}
.metric {
  padding:16px 20px;
  border-right:1px solid var(--line);
}
.metric:last-child { border-right:0; }
.metric span {
  display:block;
  margin-bottom:4px;
  color:var(--muted);
  font-size:11px;
  font-weight:700;
  letter-spacing:.08em;
  text-transform:uppercase;
}
.metric strong {
  font-size:17px;
}
.summary {
  padding:18px 28px;
  border-bottom:1px solid var(--line);
  background:var(--soft);
}
.summary p { margin:0; }.severity-line{margin-top:6px!important;color:var(--muted);font-size:12px}.retest-note{margin-top:8px!important;color:var(--muted);font-size:12px;line-height:1.5}
.issues {
  padding:18px 24px 28px;
}
.bug-row {
  display:grid;
  grid-template-columns:78px minmax(0,1fr);
  margin:0 0 10px;
  border:1px solid var(--line);
  border-radius:10px;
  overflow:hidden;
  background:#fff;
  break-inside:avoid;
}
.bug-check {
  display:flex;
  align-items:flex-start;
  justify-content:center;
  padding:16px 10px;
  border-right:1px solid var(--line);
  background:#f8fafc;
}
.bug-check label {
  display:grid;
  justify-items:center;
  gap:5px;
  color:var(--muted);
  font-size:10px;
  font-weight:800;
  text-transform:uppercase;
  cursor:pointer;
}
.bug-check input { width:18px; height:18px; }
.bug-details > summary {
  list-style:none;
  display:grid;
  grid-template-columns:40px 86px minmax(0,1fr) max-content;
  align-items:center;
  min-height:64px;
  padding:0 14px 0 0;
  cursor:pointer;
  background:#fff;
}
.bug-details > summary::-webkit-details-marker { display:none; }
.bug-summary-number { padding:0 12px; color:var(--muted); font-size:12px; font-weight:800; }
.bug-summary-main { display:grid; gap:3px; padding:10px 12px 10px 0; }
.bug-summary-main strong { font-size:14px; line-height:1.3; }
.bug-summary-meta { color:var(--muted); font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; }
.details-label { color:var(--blue); font-size:11px; font-weight:800; white-space:nowrap; }
.when-open { display:none; }
.bug-details[open] .when-closed { display:none; }
.bug-details[open] .when-open { display:inline; }
.bug-details[open] > summary { background:#f8fafc; border-bottom:1px solid var(--line); }
.bug-detail-body { background:#fff; }
.issue-card {
  margin:0 0 20px;
  border:1px solid var(--line);
  border-radius:10px;
  overflow:hidden;
  break-inside:avoid;
}
.issue-head {
  display:grid;
  grid-template-columns:44px 92px 1fr;
  align-items:center;
  min-height:48px;
  background:#f8fafc;
  border-bottom:1px solid var(--line);
}
.issue-number,
.severity {
  padding:0 12px;
  font-size:12px;
  font-weight:800;
}
.severity-blocker .severity { color:var(--blocker); }
.severity-major .severity { color:var(--major); }
.issue-title {
  padding:10px 14px 10px 0;
}
.issue-head h2 {
  margin:0;
  font-size:16px;
  line-height:1.25;
}
.meta-line {
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  margin-top:5px;
  color:var(--muted);
  font-size:10px;
  font-weight:700;
  letter-spacing:.04em;
  text-transform:uppercase;
}
.row {
  display:grid;
  grid-template-columns:150px minmax(0,1fr);
  border-bottom:1px solid var(--line);
}
.row:last-child { border-bottom:0; }
.label {
  padding:13px 15px;
  background:#f8fafc;
  color:var(--blue);
  font-size:12px;
  font-weight:800;
}
.value {
  padding:13px 16px;
}
.checklist{list-style:none;margin:0;padding:0}.checklist li+li{margin-top:7px}.checklist label{display:flex;gap:8px;align-items:flex-start}.checklist input{margin-top:3px}.steps{margin:0;padding-left:20px}.steps li+li{margin-top:5px}.fixed-cell{text-align:center;width:54px}.fixed-cell input{width:16px;height:16px}.table-id{margin-top:2px;color:var(--muted);font-size:10px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace}
.technical-row {
  padding:14px 16px;
  border-top:1px solid var(--line);
  background:#fcfcfd;
}
.technical summary {
  cursor:pointer;
  color:var(--blue);
  font-size:12px;
  font-weight:800;
}
.technical-text {
  margin-top:10px;
  white-space:pre-wrap;
  font:13px/1.55 ui-monospace, SFMono-Regular, Consolas, monospace;
}
.technical-sub {
  margin-top:12px;
  font-size:13px;
}
.technical-sub ul {
  margin:6px 0 0;
  padding-left:20px;
}
.dashboard,
.legend {
  padding:20px 24px;
  border-bottom:1px solid var(--line);
}
.dashboard h2,
.legend h2 {
  margin:0 0 12px;
  font-size:15px;
}
.compact-legend details>summary{cursor:pointer;color:var(--blue);font-size:12px;font-weight:800}.compact-legend .legend-grid{margin-top:12px}
.table-wrap { overflow-x:auto; }
table {
  width:100%;
  border-collapse:collapse;
  font-size:12px;
}
th, td {
  padding:9px 10px;
  border:1px solid var(--line);
  text-align:left;
  vertical-align:top;
}
th {
  background:#f8fafc;
  color:var(--blue);
}
.legend-grid {
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
  gap:10px;
}
.legend-grid div {
  padding:10px 12px;
  border:1px solid var(--line);
  border-radius:8px;
  background:#f8fafc;
}
.legend-grid strong,
.legend-grid span { display:block; }
.legend-grid span {
  margin-top:4px;
  color:var(--muted);
  font-size:12px;
}
.empty {
  padding:30px;
  text-align:center;
  color:var(--muted);
  background:var(--soft);
  border-radius:10px;
}
@media (max-width:700px) {
  .report { width:100%; margin:0; border-radius:0; }
  .metrics { grid-template-columns:1fr 1fr; }
  .metric:nth-child(2) { border-right:0; }
  .metric:nth-child(-n+2) { border-bottom:1px solid var(--line); }
  .row { grid-template-columns:1fr; }
  .label { padding-bottom:6px; }
  .value { padding-top:7px; }
  .issue-head { grid-template-columns:42px 82px 1fr; }
  .bug-row { grid-template-columns:62px minmax(0,1fr); }
  .bug-details > summary { grid-template-columns:32px 74px minmax(0,1fr); padding-right:10px; }
  .details-label { grid-column:3; margin:0 0 10px; }
  .bug-summary-main { padding-right:0; }
}
@media print {
  body { background:#fff; }
  .report {
    width:100%;
    margin:0;
    border:0;
    border-radius:0;
    box-shadow:none;
  }
  .issue-card,
  .bug-row { break-inside:avoid-page; }
  .bug-details > .bug-detail-body { display:block !important; }
  .bug-details > summary .details-label { display:none !important; }
  .technical { display:block; }
  .technical summary { list-style:none; }
  .technical > * { display:block !important; }
  input[type="checkbox"] {
    appearance:none;
    width:11px;
    height:11px;
    border:1px solid #555;
    vertical-align:middle;
  }
  @page { margin:12mm; size:A4; }
}
</style>
</head>
<body>
<main class="report">
  <section class="hero">
    <div class="brand">MIVUBI · M-BEDROCK-DEV</div>
    <h1>${escapeHtml(document.map.name)} — Bug Report</h1>
    <p class="subtitle">${escapeHtml(document.subtitle)}</p>
  </section>
  <section class="metrics">
    <div class="metric"><span>Map Version</span><strong>${escapeHtml(document.map.mapVersion)}</strong></div>
    <div class="metric"><span>Tested Version</span><strong>${escapeHtml(document.map.testedVersion)}</strong></div>
    <div class="metric"><span>Open Issues</span><strong>${document.summary.openIssues}</strong></div>
    <div class="metric"><span>Fixed Recorded</span><strong>${document.summary.fixedIssues}</strong></div>
  </section>
  <section class="summary">
    <p>${escapeHtml(document.summary.statement)}</p>
    <p class="severity-line"><strong>Priority:</strong> ${escapeHtml(severitySummary || "—")}</p>
    <p class="retest-note"><strong>Retest:</strong> open a bug, follow How to Reproduce, compare Observed vs Expected, then check Fixed only when the wrong behavior no longer occurs and the Expected result is confirmed.</p>
  </section>
  ${severityLegend}
  <section class="issues">
${cards}
  </section>
</main>
</body>
</html>
`;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const source = await readFile(args.input, "utf8");
  const raw = JSON.parse(source) as unknown;

  if (isMapAuditHtmlInput(raw)) {
    const auditIssues =
      mapAuditHtmlInputIssues(raw);
    if (auditIssues.length > 0) {
      throw new Error(
        "Map Audit Output V2 is not render-ready: " +
          auditIssues.join("; "),
      );
    }
    const label =
      raw.evidenceScope?.selectedArtifact ||
      raw.artifactId;
    const stem =
      safeSegment(label) +
      " v" +
      safeSegment(raw.mapVersion) +
      " - Map Audit Report";
    await mkdir(args.outDir, { recursive: true });
    const output = join(args.outDir, stem + ".html");
    await writeFile(
      output,
      renderCompleteMapAuditHtml(raw),
      "utf8",
    );
    process.stdout.write(output + "\n");
    return;
  }

  const parsed = parseBugReportV2Json(source);
  if (!parsed.ok) {
    throw new Error(
      "Input is neither Map Audit Output V2 nor valid Approved Bug Report V2: " +
        parsed.issues
          .map((issue) =>
            issue.path + ": " + issue.message
          )
          .join("; "),
    );
  }

  const document =
    projectBugReportClientDocument(
      parsed.report,
      {
        includeFixed: args.includeFixed,
        includeMinor: args.includeMinor,
      },
    );
  const quality =
    reviewBugReportClientDocument(document);
  if (quality.length > 0) {
    throw new Error(
      "Client document is not render-ready: " +
        quality
          .map((issue) =>
            issue.path + ": " + issue.message
          )
          .join("; "),
    );
  }

  const stem =
    safeSegment(parsed.report.map.name) +
    " v" +
    safeSegment(parsed.report.map.mapVersion) +
    " - Bug Report";

  await mkdir(args.outDir, { recursive: true });
  const output = join(args.outDir, stem + ".html");
  await writeFile(output, renderHtml(document), "utf8");
  process.stdout.write(output + "\n");
}

await main();
