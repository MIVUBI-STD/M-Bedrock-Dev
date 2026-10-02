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
  buildBugReportClientLayoutPlan,
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
      "Missing --input <canonical Bug Report V2 JSON>.",
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

function technicalBlock(
  value: string,
): string {
  return (
    '<details class="technical">' +
    '<summary>Technical Analysis</summary>' +
    '<div class="technical-text">' +
    escapeHtml(value) +
    "</div></details>"
  );
}

function issueCard(issue: BugReportClientIssue): string {
  const metadata =
    '<div class="meta-line"><span>' +
    escapeHtml(issue.id) +
    '</span><span>' +
    escapeHtml(issue.category) +
    '</span><span>' +
    escapeHtml(issue.foundBy.toUpperCase()) +
    "</span></div>";

  const rows = [
    '<div class="row"><div class="label">Issue</div><div class="value">' +
      escapeHtml(issue.issue) +
      "</div></div>",
    '<div class="row"><div class="label">Tester Checklist</div><div class="value">' +
      checklist(issue.reproduction) +
      "</div></div>",
    '<div class="row"><div class="label">Result</div><div class="value"><strong>Observed:</strong> ' +
      escapeHtml(issue.observed) +
      '<br><strong>Expected:</strong> ' +
      escapeHtml(issue.expected) +
      "</div></div>",
    '<div class="row"><div class="label">Work Checklist</div><div class="value">' +
      checklist(issue.workChecklist, "work-checklist") +
      "</div></div>",
  ];

  if (issue.recommendedResolution) {
    rows.push(
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
        technicalBlock(issue.technicalAnalysis),
      );
    }
    if (issue.relevantCode?.length) {
      technicalParts.push(
        '<div class="technical-sub"><strong>Relevant Code</strong><ul>' +
        issue.relevantCode.map(
          (item) =>
            '<li><code>' +
            escapeHtml(item.file) +
            '</code> — ' +
            escapeHtml(item.reason) +
            '</li>',
        ).join("") +
        '</ul></div>',
      );
    }
    if (issue.mustPreserve?.length) {
      technicalParts.push(
        '<div class="technical-sub"><strong>Must Preserve</strong><ul>' +
        issue.mustPreserve.map(
          (item) =>
            '<li>' + escapeHtml(item) + '</li>',
        ).join("") +
        '</ul></div>',
      );
    }
    rows.push(
      '<div class="technical-row">' +
      technicalParts.join("") +
      '</div>',
    );
  }

  return [
    '<article class="issue-card severity-' + issue.severity + '">',
    '  <header class="issue-head">',
    '    <div class="issue-number">' +
      String(issue.number).padStart(2, "0") +
      "</div>",
    '    <div class="severity">' +
      severityLabel(issue.severity) +
      "</div>",
    '    <div class="issue-title"><h2>' +
      escapeHtml(issue.title) +
      "</h2>" +
      metadata +
      "</div>",
    "  </header>",
    '  <div class="issue-body">',
    ...rows.map((row) => "    " + row),
    "  </div>",
    "</article>",
  ].join("\n");
}

function renderHtml(
  document: BugReportClientDocument,
): string {
  const layout =
    buildBugReportClientLayoutPlan(document);
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

  const issueIndex =
    layout.showIssueIndex
      ? [
          '<section class="dashboard">',
          '<h2>Issue Dashboard</h2>',
          '<div class="table-wrap"><table>',
          '<thead><tr><th>#</th><th>ID</th><th>Severity</th><th>Category</th><th>Issue</th></tr></thead>',
          '<tbody>',
          ...document.issueIndex.map(
            (item) =>
              '<tr><td>' +
              String(item.number).padStart(2, "0") +
              '</td><td><code>' +
              escapeHtml(item.id) +
              '</code></td><td>' +
              severityLabel(item.severity) +
              '</td><td>' +
              escapeHtml(item.category) +
              '</td><td>' +
              escapeHtml(item.title) +
              '</td></tr>',
          ),
          '</tbody></table></div>',
          '</section>',
        ].join("\n")
      : "";

  const severityLegend =
    layout.showSeverityLegend
      ? [
          '<section class="legend">',
          '<h2>Severity Guide</h2>',
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
.summary p { margin:0; }
.issues {
  padding:24px;
}
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
.checklist,
.work-checklist {
  list-style:none;
  margin:0;
  padding:0;
}
.checklist li + li,
.work-checklist li + li { margin-top:7px; }
.checklist label,
.work-checklist label {
  display:flex;
  gap:8px;
  align-items:flex-start;
}
.checklist input,
.work-checklist input { margin-top:3px; }
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
  .issue-card { break-inside:avoid-page; }
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
    <div class="metric"><span>Severity</span><strong>${escapeHtml(severitySummary || "—")}</strong></div>
  </section>
  <section class="summary"><p>${escapeHtml(document.summary.statement)}</p></section>
  ${issueIndex}
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
  const parsed = parseBugReportV2Json(source);
  if (!parsed.ok) {
    throw new Error(
      "Input is not valid Bug Report V2: " +
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
