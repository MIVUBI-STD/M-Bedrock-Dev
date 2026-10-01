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

function reproductionList(
  steps: readonly string[],
): string {
  return [
    '<ol class="steps">',
    ...steps.map(
      (step) => "  <li>" + escapeHtml(step) + "</li>",
    ),
    "</ol>",
  ].join("\n");
}

function issueCard(issue: BugReportClientIssue): string {
  const rows = [
    '<div class="row"><div class="label">Issue</div><div class="value">' +
      escapeHtml(issue.issue) +
      "</div></div>",
    '<div class="row"><div class="label">How to Trigger</div><div class="value">' +
      reproductionList(issue.reproduction) +
      "</div></div>",
    '<div class="row"><div class="label">Result</div><div class="value"><strong>Observed:</strong> ' +
      escapeHtml(issue.observed) +
      '<br><strong>Expected:</strong> ' +
      escapeHtml(issue.expected) +
      "</div></div>",
  ];

  if (issue.recommendedResolution) {
    rows.push(
      '<div class="row"><div class="label">Resolution</div><div class="value">' +
        escapeHtml(issue.recommendedResolution) +
        "</div></div>",
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
    '    <h2>' + escapeHtml(issue.title) + "</h2>",
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
.issue-head h2 {
  margin:0;
  padding:10px 14px 10px 0;
  font-size:16px;
  line-height:1.25;
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
.steps {
  margin:0;
  padding-left:22px;
}
.steps li + li { margin-top:5px; }
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
