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
import {
  projectClientDocumentToTracker,
  type ProjectRegistry,
} from "./tracker/project.js";
import { renderBugTrackerHtml } from "./tracker/render-html.js";
import { exportBugTracker } from "./tracker/export.js";

interface Args {
  readonly input: string;
  readonly outDir: string;
  readonly includeFixed: boolean;
  readonly includeMinor: boolean;
}

type MapAuditHtmlInput = import(
  "../../engine/packages/orchestrator/src/map-audit-output-v2.js"
).MapAuditOutputV2;

type MapAuditHtmlFinding =
  MapAuditHtmlInput["bugs"][number];

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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

function auditObligationsSection(
  audit: MapAuditHtmlInput,
): string {
  const obligations = audit.auditObligations ?? [];
  if (obligations.length === 0) return "";

  return [
    '<section class="section obligations">',
    '<h2>Audit Obligations — Not Bugs</h2>',
    '<div class="note"><strong>Important:</strong> These are unresolved audit/model/proof obligations. They are not BUG or DESIGN_MISMATCH findings unless later causal analysis proves a player-visible contradiction.</div>',
    ...obligations.map((item) =>
      '<article class="obligation-card"><details><summary><strong>' +
      escapeHtml(item.title) +
      '</strong><span>' +
      escapeHtml(item.stage) +
      ' · ' +
      escapeHtml(item.source) +
      '</span></summary><div class="obligation-body">' +
      '<div class="row"><div class="label">Why It Exists</div><div class="value">' +
      escapeHtml(item.reason) +
      '</div></div>' +
      '<div class="row"><div class="label">Missing Proof</div><div class="value">' +
      escapeHtml(item.missingProof) +
      '</div></div>' +
      '<div class="row"><div class="label">Resolve With</div><div class="value">' +
      escapeHtml(item.validationTest) +
      '</div></div>' +
      '</div></details></article>'
    ),
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

function userIntentSummary(
  audit: MapAuditHtmlInput,
): string {
  const intent = audit.userIntent;
  if (!intent) return "";

  const symptoms = intent.items.filter(
    (item) => item.kind === "SYMPTOM_REPORT",
  );
  const suspicions = intent.items.filter(
    (item) => item.kind === "SUSPICION",
  );
  const constraints = intent.items.filter(
    (item) => item.kind === "TEST_CONSTRAINT",
  );
  const expectations = intent.items.filter(
    (item) => item.kind === "EXPECTATION_CLAIM",
  );
  const designClaims = intent.items.filter(
    (item) => item.kind === "DESIGN_CLAIM",
  );
  const historical = intent.items.filter(
    (item) => item.kind === "HISTORICAL_REFERENCE",
  );
  const scope = intent.items.filter(
    (item) =>
      item.kind === "SCOPE_REQUEST" ||
      item.kind === "EXCLUSION_REQUEST",
  );
  const fragmentById = new Map(
    intent.fragments.map(
      (fragment) => [fragment.id, fragment],
    ),
  );
  const unmapped = intent.unmappedFragmentIds
    .map((id) => fragmentById.get(id))
    .filter(
      (
        item,
      ): item is {
        readonly id: string;
        readonly raw: string;
      } => item !== undefined,
    );

  const list = (
    items: readonly { readonly normalized: string }[],
  ): string =>
    items.length === 0
      ? "—"
      : items.map(
          (item) =>
            "<li>" +
            escapeHtml(item.normalized) +
            "</li>",
        ).join("");

  return [
    '<section class="section user-intent">',
    '<details>',
    '<summary>User Input Interpretation — Guidance Only</summary>',
    '<div class="note"><strong>Authority:</strong> User wording only raises search priority. It does not prove Expected/Actual behavior, BUG/DESIGN_MISMATCH, severity, safety, or absence.</div>',
    '<div class="row"><div class="label">Symptoms</div><div class="value"><ul>' +
      list(symptoms) +
      '</ul></div></div>',
    '<div class="row"><div class="label">Suspicions</div><div class="value"><ul>' +
      list(suspicions) +
      '</ul></div></div>',
    '<div class="row"><div class="label">Priority Domains</div><div class="value">' +
      escapeHtml(
        intent.priorityDomains.join(", ") || "—",
      ) +
      '</div></div>',
    '<div class="row"><div class="label">Priority Player Flow</div><div class="value">' +
      escapeHtml(
        intent.priorityPlayerFlows.join(", ") || "—",
      ) +
      '</div></div>',
    '<div class="row"><div class="label">Expectation Claims</div><div class="value"><ul>' +
      list(expectations) +
      '</ul></div></div>',
    '<div class="row"><div class="label">Design Claims</div><div class="value"><ul>' +
      list(designClaims) +
      '</ul></div></div>',
    '<div class="row"><div class="label">Historical Hints</div><div class="value"><ul>' +
      list(historical) +
      '</ul></div></div>',
    '<div class="row"><div class="label">Scope Guidance</div><div class="value"><ul>' +
      list(scope) +
      '</ul></div></div>',
    '<div class="row"><div class="label">Test Constraints</div><div class="value"><ul>' +
      list(constraints) +
      '</ul></div></div>',
    ...(unmapped.length === 0
      ? []
      : [
          '<div class="row"><div class="label">Unmapped Input</div><div class="value"><ul>' +
          unmapped.map(
            (item) =>
              '<li>' +
              escapeHtml(item.raw) +
              '</li>',
          ).join("") +
          '</ul><div class="proof-note">Preserved as Audit Obligation; not ignored and not treated as a bug.</div></div></div>',
        ]),
    ...(intent.ambiguities.length === 0
      ? []
      : [
          '<div class="row"><div class="label">Ambiguities</div><div class="value"><ul>' +
          intent.ambiguities.map(
            (item) =>
              '<li>' +
              escapeHtml(item) +
              '</li>',
          ).join("") +
          '</ul></div></div>',
        ]),
    '</details>',
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
        ' <span class="grounding">[' +
        escapeHtml(design.objectiveGrounding) +
        ']</span>' +
        '<br><strong>Win:</strong> ' +
        escapeHtml(design.winCondition) +
        ' <span class="grounding">[' +
        escapeHtml(design.winConditionGrounding) +
        ']</span>' +
        '<br><strong>Lose:</strong> ' +
        escapeHtml(design.loseCondition) +
        ' <span class="grounding">[' +
        escapeHtml(design.loseConditionGrounding) +
        ']</span>' +
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
      '<div class="row"><div class="label">Finding Visibility Gate</div><div class="value">' +
        '<strong>Status:</strong> ' +
        escapeHtml(honesty.status) +
        '<br><span class="proof-pref">PASS means all tracked material residue is visibly represented; it does not claim the audit is infallible.</span>' +
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
  const provenBugs =
    audit.bugs.filter(
      (item) => item.status === "PROVEN",
    );
  const pendingBugs =
    audit.bugs.filter(
      (item) =>
        item.status === "NEED_VALIDATION",
    );
  const provenDesignMismatches =
    audit.designMismatches.filter(
      (item) => item.status === "PROVEN",
    );
  const pendingDesignMismatches =
    audit.designMismatches.filter(
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
.metrics{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid #d9dee8}
.metric{padding:16px 20px;border-right:1px solid #d9dee8}.metric:last-child{border-right:0}.metric span{display:block;color:#667085;font-size:11px;font-weight:700;text-transform:uppercase}.metric strong{font-size:18px}
.section{padding:24px}.section h2{margin:0 0 14px}.section h3{margin:18px 0 10px;font-size:13px;color:#3157a4;text-transform:uppercase;letter-spacing:.04em}.note{padding:14px 18px;background:#fff8e6;border:1px solid #eed28a;border-radius:8px;margin-bottom:18px}.control-summary{border-bottom:1px solid #d9dee8;background:#fbfcfe}.control-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px}.control-grid div{padding:12px 14px;border:1px solid #d9dee8;border-radius:8px;background:#fff}.control-grid span{display:block;color:#667085;font-size:10px;font-weight:800;text-transform:uppercase}.control-grid strong{display:block;margin-top:3px;font-size:13px}.user-intent{padding-top:16px;padding-bottom:16px;border-bottom:1px solid #d9dee8;background:#fdfefe}.user-intent>details>summary{cursor:pointer;color:#3157a4;font-size:12px;font-weight:800}.user-intent ul{margin:0;padding-left:18px}.audit-context{padding-top:16px;padding-bottom:16px;border-bottom:1px solid #d9dee8}.audit-context>details>summary{cursor:pointer;color:#3157a4;font-size:12px;font-weight:800}.audit-context-body{margin-top:12px;border:1px solid #d9dee8;border-radius:8px;overflow:hidden}.grounding{color:#667085;font-size:11px;text-transform:uppercase}.obligations{border-top:1px solid #d9dee8;background:#fbfcfe}.obligation-card{margin:0 0 10px;border:1px solid #d9dee8;border-radius:8px;background:#fff;overflow:hidden}.obligation-card>details>summary{display:flex;justify-content:space-between;gap:12px;padding:12px 14px;cursor:pointer}.obligation-card>details>summary span{color:#667085;font-size:10px;font-weight:800;text-transform:uppercase}.obligation-body{border-top:1px solid #d9dee8}
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
    <div class="metric"><span>Audit Obligations</span><strong>${(audit.auditObligations ?? []).length}</strong></div>
  </section>
  ${auditControlSummary(audit)}
  ${userIntentSummary(audit)}
  ${auditContextSummary(audit)}
  ${auditObligationsSection(audit)}
  <section class="section">
    <div class="note"><strong>Validation status:</strong> NEED VALIDATION identifies a material finding that still requires deciding proof. It remains listed until confirmed or disproved, and no final severity is assigned while unresolved.</div>
    <h2>Bugs</h2>
    <h3>PROVEN</h3>
    ${provenBugs.length > 0 ? provenBugs.map(auditFindingCard).join("\n") : "<p>No proven bugs.</p>"}
    <h3>NEED VALIDATION</h3>
    ${pendingBugs.length > 0 ? pendingBugs.map(auditFindingCard).join("\n") : "<p>No unresolved bug findings.</p>"}
  </section>
  <section class="section">
    <h2>Design Mismatches</h2>
    <h3>PROVEN</h3>
    ${provenDesignMismatches.length > 0 ? provenDesignMismatches.map(auditFindingCard).join("\n") : "<p>No proven design mismatches.</p>"}
    <h3>NEED VALIDATION</h3>
    ${pendingDesignMismatches.length > 0 ? pendingDesignMismatches.map(auditFindingCard).join("\n") : "<p>No unresolved design-mismatch findings.</p>"}
  </section>
  ${auditValidationPlan(audit)}
</main>
</body>
</html>`;
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

  const registryPath = resolve(
    process.cwd(),
    "workspace/project-registry.json",
  );
  const registrySource = await readFile(registryPath, "utf8");
  const registry = JSON.parse(registrySource) as ProjectRegistry;
  const tracker = projectClientDocumentToTracker(
    document,
    registry,
  );
  await mkdir(args.outDir, { recursive: true });
  await exportBugTracker(
    tracker,
    args.outDir,
    renderBugTrackerHtml,
  );
  process.stdout.write(
    join(args.outDir, "Bug-Tracker-Report.html") + "\n" +
    join(args.outDir, "Bug-Tracker-Report.json") + "\n",
  );
}

await main();
