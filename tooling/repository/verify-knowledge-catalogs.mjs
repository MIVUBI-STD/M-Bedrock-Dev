import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const directory = "knowledge";
const files = readdirSync(directory)
  .filter((name) => name.endsWith(".json"))
  .map((name) => join(directory, name))
  .sort();

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

  const ids = new Set();
  for (const fact of catalog.facts ?? []) {
    if (!fact.id || ids.has(fact.id)) throw new Error(`${path}: invalid/duplicate fact id`);
    ids.add(fact.id);
    if (!Array.isArray(fact.sourceIds) || fact.sourceIds.length === 0) {
      throw new Error(`${path}: fact ${fact.id} has no provenance`);
    }
    for (const sourceId of fact.sourceIds) {
      if (!sources.has(sourceId)) throw new Error(`${path}: missing source ${sourceId}`);
    }
  }

  const relationIds = new Set();
  for (const relation of catalog.relations ?? []) {
    if (!relation.id || relationIds.has(relation.id)) {
      throw new Error(`${path}: invalid/duplicate relation id`);
    }
    relationIds.add(relation.id);
    if (!relation.subject || !relation.object) {
      throw new Error(`${path}: relation ${relation.id} lacks subject/object`);
    }
    for (const sourceId of relation.sourceIds ?? []) {
      if (!sources.has(sourceId)) throw new Error(`${path}: missing relation source ${sourceId}`);
    }
  }
}

console.log(`Knowledge catalog verification passed (${files.length} catalogs).`);
