import { readFileSync } from "node:fs";

const CLI_PATH = "apps/cli/src/main.ts";
const source = readFileSync(CLI_PATH, "utf8");

const productionCommands = [
  "audit",
  "probe-plan",
  "probe-replay",
  "workflow",
  "arena-audit",
  "review",
  "inspect",
];

function commandBody(command) {
  const marker = `command === "${command}"`;
  const start = source.indexOf(marker);
  if (start < 0) {
    throw new Error(
      "Production selected-map command is missing: " + command,
    );
  }

  const next = productionCommands
    .map((candidate) => {
      if (candidate === command) return -1;
      const index = source.indexOf(
        `command === "${candidate}"`,
        start + marker.length,
      );
      return index;
    })
    .filter((index) => index > start)
    .sort((left, right) => left - right)[0];

  return source.slice(
    start,
    next === undefined ? source.length : next,
  );
}

const issues = [];

for (const command of productionCommands) {
  const body = commandBody(command);
  if (!body.includes("runSelectedMapAudit(")) {
    issues.push(
      command +
        " does not enter through runSelectedMapAudit().",
    );
  }
  if (body.includes("inspectArtifact(")) {
    issues.push(
      command +
        " bypasses the canonical selected-map audit through inspectArtifact().",
    );
  }
}

const internalImport =
  'from "../../../engine/packages/orchestrator/src/inspection/inspect-artifact.js"';
if (!source.includes(internalImport)) {
  issues.push(
    "Engineering-only inspectArtifact import is not explicitly internal.",
  );
}

if (issues.length > 0) {
  console.error(
    [
      "Selected-map audit entrypoint verification failed:",
      ...issues.map((issue) => "- " + issue),
    ].join("\n"),
  );
  process.exitCode = 1;
} else {
  console.log(
    "Selected-map production commands use the canonical audit entrypoint.",
  );
}
