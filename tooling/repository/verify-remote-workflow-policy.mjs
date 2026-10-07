import { existsSync, readFileSync } from "node:fs";

const failures = [];

const requiredPolicy = [
  ["README.md", "local checkout is **not required**"],
  ["AGENTS.md", "REMOTE_GITHUB is the normal ChatGPT execution mode"],
  ["GITHUB_RULES.md", "REMOTE_GITHUB is the normal ChatGPT repository context"],
  ["GITHUB_RULES.md", "ChatGPT no-local-PC invariant"],
  ["docs/system/development-operations.md", "primary ChatGPT development mode is **REMOTE_GITHUB**"],
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

if (existsSync("package.json")) {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  if (Object.prototype.hasOwnProperty.call(pkg.scripts ?? {}, "check")) {
    failures.push("Generic npm script 'check' is forbidden; executable verification must remain explicitly local/optional.");
  }
  if (Object.prototype.hasOwnProperty.call(pkg.scripts ?? {}, "verify:ready")) {
    failures.push("Generic npm script 'verify:ready' is forbidden; use verify:local-ready for optional local readiness.");
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