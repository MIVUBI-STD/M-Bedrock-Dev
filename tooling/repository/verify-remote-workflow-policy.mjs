import { existsSync, readFileSync } from "node:fs";

const failures = [];

const requiredPolicy = [
  ["README.md", "local checkout is **not required**"],
  ["AGENTS.md", "REMOTE_GITHUB is the normal ChatGPT execution mode"],
  ["AGENTS.md", "This workspace is **ChatGPT + GitHub/cloud-only**"],
  ["GITHUB_RULES.md", "`REMOTE_GITHUB` is the normal ChatGPT repository context"],
  ["GITHUB_RULES.md", "ChatGPT no-local-PC invariant"],
  ["GITHUB_RULES.md", "M-Lazy-Developer ChatGPT workspace contract: ChatGPT + GitHub/cloud-only"],
  ["GITHUB_RULES.md", "Never ask the user to run npm, Vitest, TypeScript, Minecraft, or a checkout on their own computer"],
  ["GITHUB_RULES.md", "UNKNOWN / NOT EXECUTED"],
  ["docs/system/development-operations.md", "primary ChatGPT development mode is **REMOTE_GITHUB**"],
  ["docs/system/development-operations.md", "ChatGPT does not route its unfinished verification to a user-local PC"],
];

for (const [path, phrase] of requiredPolicy) {
  if (!existsSync(path)) {
    failures.push("Missing remote-workflow policy owner: " + path);
    continue;
  }
  const text = readFileSync(path, "utf8");
  if (!text.includes(phrase)) {
    failures.push(path + " must preserve remote-GitHub-first policy: " + phrase);
  }
}

if (!existsSync(".github/workflows/package-source.yml")) {
  failures.push(
    "Missing REMOTE_GITHUB portable workspace transport: .github/workflows/package-source.yml",
  );
} else {
  const portableWorkflow = readFileSync(
    ".github/workflows/package-source.yml",
    "utf8",
  );
  for (const required of [
    "workflow_dispatch:",
    "lazy-developer-portable",
    "retention-days: 1",
  ]) {
    if (!portableWorkflow.includes(required)) {
      failures.push(
        "Portable workspace workflow must preserve: " + required,
      );
    }
  }
}

if (existsSync("package.json")) {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  if (Object.prototype.hasOwnProperty.call(pkg.scripts ?? {}, "check")) {
    failures.push("Generic npm script 'check' is forbidden; executable verification is optional and must never block ChatGPT/GitHub cloud-only completion.");
  }
  if (Object.prototype.hasOwnProperty.call(pkg.scripts ?? {}, "verify:ready")) {
    failures.push("Generic npm script 'verify:ready' is forbidden; only the existing optional developer-specific verify:local-ready may remain.");
  }
  if (!Object.prototype.hasOwnProperty.call(pkg.scripts ?? {}, "verify:local-ready")) {
    failures.push("Optional local readiness script is missing: verify:local-ready");
  }
}

if (failures.length) {
  console.error("Remote workflow policy violations:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Remote GitHub workflow policy verification passed.");