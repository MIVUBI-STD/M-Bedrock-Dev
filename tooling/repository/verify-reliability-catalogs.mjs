import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = "reliability/catalogs";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

const regressions = readJson(join(root, "regressions.json"));
const coverage = readJson(join(root, "coverage.json"));

if (regressions.schemaVersion !== 1 || !Array.isArray(regressions.regressions)) {
  fail("Invalid reliability regressions catalog.");
}
if (coverage.schemaVersion !== 1 || !Array.isArray(coverage.coverage)) {
  fail("Invalid reliability coverage catalog.");
}

const regressionIds = new Set();
for (const item of regressions.regressions) {
  if (!item.id || regressionIds.has(item.id)) fail(`Invalid/duplicate regression id: ${item.id}`);
  regressionIds.add(item.id);
  if (!item.title || !item.expected || !item.observed) fail(`Incomplete regression: ${item.id}`);
}

const coverageKeys = new Set();
for (const item of coverage.coverage) {
  const key = `${item.domain}:${item.lane}`;
  if (coverageKeys.has(key)) fail(`Duplicate coverage entry: ${key}`);
  coverageKeys.add(key);

  if (item.state === "partial" || item.state === "covered") {
    if (!item.evidence || !String(item.evidence).trim()) {
      fail(`Coverage ${key} requires evidence for state ${item.state}.`);
    }
    if (!Array.isArray(item.proofPaths) || item.proofPaths.length === 0) {
      fail(`Coverage ${key} requires proofPaths for state ${item.state}.`);
    }
    for (const proofPath of item.proofPaths) {
      if (typeof proofPath !== "string" || !proofPath.trim()) {
        fail(`Coverage ${key} has an invalid proof path.`);
      }
      if (!existsSync(proofPath)) {
        fail(`Coverage ${key} proof path does not exist: ${proofPath}`);
      }
    }
  }
}

const updatesRoot = join(root, "minecraft-updates");
for (const name of readdirSync(updatesRoot)) {
  if (!name.endsWith(".json")) continue;
  const file = readJson(join(updatesRoot, name));
  if (file.schemaVersion !== 1 || !file.delta || !Array.isArray(file.delta.entries)) {
    fail(`Invalid update delta catalog: ${name}`);
  }
  const version = name.slice(0, -5);
  if (file.delta.toVersion !== version) {
    fail(`Update delta filename/version mismatch: ${name}`);
  }
}

console.log("Reliability catalogs verification passed.");
