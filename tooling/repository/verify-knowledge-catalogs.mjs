import { readFileSync } from "node:fs";

const files = [
  "knowledge/core-bedrock.json",
  "knowledge/education.json",
];

for (const path of files) {
  const catalog = JSON.parse(readFileSync(path, "utf8"));
  if (catalog.schemaVersion !== 1) throw new Error(`${path}: schemaVersion must be 1`);
  const sources = new Set();
  for (const source of catalog.sources ?? []) {
    if (!source.id || !source.url?.startsWith("https://")) {
      throw new Error(`${path}: invalid source`);
    }
    if (sources.has(source.id)) throw new Error(`${path}: duplicate source ${source.id}`);
    sources.add(source.id);
  }
  const facts = new Set();
  for (const fact of catalog.facts ?? []) {
    if (!fact.id || facts.has(fact.id)) throw new Error(`${path}: invalid/duplicate fact id`);
    facts.add(fact.id);
    if (!Array.isArray(fact.sourceIds) || fact.sourceIds.length === 0) {
      throw new Error(`${path}: fact ${fact.id} has no provenance`);
    }
    for (const sourceId of fact.sourceIds) {
      if (!sources.has(sourceId)) throw new Error(`${path}: missing source ${sourceId}`);
    }
  }
}

console.log("Knowledge catalog verification passed.");
