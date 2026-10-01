import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const [manifestPath, caseId] = process.argv.slice(2);
if (!manifestPath || !caseId) {
  throw new Error("Usage: node check-case-ready.mjs <manifest.json> <case-id>");
}

const data = JSON.parse(readFileSync(resolve(manifestPath), "utf8"));
const item = (data.cases ?? []).find((entry) => entry.id === caseId);

if (!item) {
  throw new Error(`case not found: ${caseId}`);
}

const errors = [];
const readiness = item.readiness ?? {};

for (const [key, value] of Object.entries(readiness)) {
  if (value === "missing") {
    errors.push(`${key} is missing`);
  }
}

if (!item.sourceRef) {
  errors.push("sourceRef is required");
} else {
  const [sourcePath] = String(item.sourceRef).split("#");
  if (!sourcePath || !existsSync(resolve(sourcePath))) {
    errors.push(`sourceRef does not resolve: ${item.sourceRef}`);
  }
}

if (data.lane === "acceptance" && data.policy?.blindEvaluationRequired !== true) {
  errors.push("acceptance case requires blindEvaluationRequired=true");
}

if (errors.length > 0) {
  for (const error of errors) {
    process.stderr.write(`- ${error}\n`);
  }
  process.exitCode = 1;
} else {
  process.stdout.write(JSON.stringify({
    caseId,
    lane: data.lane,
    promotable: true
  }, null, 2) + "\n");
}
