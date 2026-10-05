import { existsSync, readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const failures = [];
const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean);

const requiredPlanning = [
  "planning/README.md",
  "planning/development.md",
  "planning/operations.md",
  "planning/projects.md",
];

for (const path of requiredPlanning) {
  if (!existsSync(path)) failures.push("Missing planning owner: " + path);
}

if (existsSync("planning")) {
  const allowed = new Set(["README.md", "development.md", "operations.md", "projects.md"]);
  for (const entry of readdirSync("planning", { withFileTypes: true })) {
    if (entry.isDirectory()) {
      failures.push(
        "Planning must remain flat until scale justifies a subdirectory: planning/" +
          entry.name,
      );
    } else if (!allowed.has(entry.name)) {
      failures.push("Unexpected planning file: planning/" + entry.name);
    }
  }
}

const forbiddenPlanningNames = /(?:^|\/)(?:todo|misc|latest|final|temp|backup|current-work)(?:[._-]|$)/i;
for (const path of tracked.filter((item) => item.startsWith("planning/"))) {
  if (forbiddenPlanningNames.test(path)) {
    failures.push("Ambiguous planning name: " + path);
  }
}

const workspaceAgents = existsSync("workspace/AGENTS.md")
  ? readFileSync("workspace/AGENTS.md", "utf8")
  : "";
if (/workspace\/active\//.test(workspaceAgents)) {
  failures.push("workspace/AGENTS.md still references retired workspace/active layout.");
}
if (!/planning\//.test(workspaceAgents)) {
  failures.push("workspace/AGENTS.md must route planning intent to planning/.");
}

if (!existsSync("workspace/developer-notes.json")) {
  failures.push("Missing canonical Developer Note ledger: workspace/developer-notes.json");
}

if (existsSync("workspace/reports")) {
  const allowedReportFiles = new Set(["README.md", "AGENTS.md"]);
  for (const entry of readdirSync("workspace/reports", { withFileTypes: true })) {
    if (entry.isDirectory()) {
      failures.push("workspace/reports must remain a flat canonical Bug Report V2 store: " + entry.name);
      continue;
    }
    if (allowedReportFiles.has(entry.name)) continue;
    if (!/-BugReport\.json$/.test(entry.name)) {
      failures.push("Non-BugReport artifact must not live in workspace/reports: " + entry.name);
    }
  }
}

if (existsSync("workspace/reports/approved-publication-dataset.json")) {
  failures.push("Derived publication dataset must not live in workspace/reports.");
}
if (!existsSync("workspace/publication/source-dataset.json")) {
  failures.push("Missing derived publication source dataset: workspace/publication/source-dataset.json");
}

const planningReadme = existsSync("planning/README.md")
  ? readFileSync("planning/README.md", "utf8")
  : "";
for (const term of ["development.md", "operations.md", "projects.md", "workspace/"]) {
  if (!planningReadme.includes(term)) {
    failures.push("planning/README.md missing boundary/reference: " + term);
  }
}

const docsReadme = existsSync("docs/README.md")
  ? readFileSync("docs/README.md", "utf8")
  : "";
if (!docsReadme.includes("planning/")) {
  failures.push("docs/README.md must distinguish durable docs from planning/.");
}

if (failures.length) {
  console.error("Information architecture violations:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Information architecture verification passed.");