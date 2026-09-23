import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const directory = "knowledge";
const files = readdirSync(directory)
  .filter((name) => name.endsWith(".json"))
  .map((name) => join(directory, name))
  .sort();

const sourceIdsGlobal = new Map();
const factIdsGlobal = new Map();
const relationIdsGlobal = new Map();

function validUrl(source) {
  if (source.authority === "project-policy") {
    return source.url?.startsWith("project://") || source.url?.startsWith("https://");
  }
  return source.url?.startsWith("https://");
}

for (const path of files) {
  const catalog = JSON.parse(readFileSync(path, "utf8"));
  if (catalog.schemaVersion !== 1) throw new Error(`${path}: schemaVersion must be 1`);

  const sources = new Set();
  for (const source of catalog.sources ?? []) {
    if (!source.id || !validUrl(source)) {
      throw new Error(`${path}: invalid source ${source.id ?? "<missing>"}`);
    }
    if (sources.has(source.id)) throw new Error(`${path}: duplicate source ${source.id}`);
    sources.add(source.id);

    const previous = sourceIdsGlobal.get(source.id);
    const signature = JSON.stringify({
      url: source.url,
      authority: source.authority,
      confidence: source.confidence,
    });
    if (previous && previous.signature !== signature) {
      throw new Error(
        `${path}: source ${source.id} conflicts with ${previous.path}`,
      );
    }
    sourceIdsGlobal.set(source.id, { path, signature });
  }

  const ids = new Set();
  for (const fact of catalog.facts ?? []) {
    if (!fact.id || ids.has(fact.id)) throw new Error(`${path}: invalid/duplicate fact id`);
    ids.add(fact.id);

    const previous = factIdsGlobal.get(fact.id);
    if (previous) throw new Error(`${path}: fact ${fact.id} duplicates ${previous}`);
    factIdsGlobal.set(fact.id, path);

    if (!fact.domain || !fact.subject || !fact.statement) {
      throw new Error(`${path}: fact ${fact.id} lacks domain/subject/statement`);
    }
    if (!Array.isArray(fact.applicability?.editions) || fact.applicability.editions.length === 0) {
      throw new Error(`${path}: fact ${fact.id} lacks editions`);
    }
    if (!Array.isArray(fact.sourceIds) || fact.sourceIds.length === 0) {
      throw new Error(`${path}: fact ${fact.id} has no provenance`);
    }
    for (const sourceId of fact.sourceIds) {
      if (!sources.has(sourceId)) throw new Error(`${path}: missing source ${sourceId}`);
    }
    if (
      fact.classification === "project-policy" &&
      !fact.sourceIds.some((sourceId) =>
        (catalog.sources ?? []).some(
          (source) => source.id === sourceId && source.authority === "project-policy",
        )
      )
    ) {
      throw new Error(`${path}: project-policy fact ${fact.id} lacks project-policy source`);
    }
  }

  const relationIds = new Set();
  for (const relation of catalog.relations ?? []) {
    if (!relation.id || relationIds.has(relation.id)) {
      throw new Error(`${path}: invalid/duplicate relation id`);
    }
    relationIds.add(relation.id);

    const previous = relationIdsGlobal.get(relation.id);
    if (previous) throw new Error(`${path}: relation ${relation.id} duplicates ${previous}`);
    relationIdsGlobal.set(relation.id, path);

    if (!relation.domain || !relation.kind || !relation.subject || !relation.object) {
      throw new Error(`${path}: relation ${relation.id} lacks domain/kind/subject/object`);
    }
    if (!Array.isArray(relation.sourceIds) || relation.sourceIds.length === 0) {
      throw new Error(`${path}: relation ${relation.id} has no provenance`);
    }
    for (const sourceId of relation.sourceIds) {
      if (!sources.has(sourceId)) throw new Error(`${path}: missing relation source ${sourceId}`);
    }
  }
}

for (const [id, factPath] of factIdsGlobal) {
  const relationPath = relationIdsGlobal.get(id);
  if (relationPath) {
    throw new Error(`Knowledge id ${id} reused by fact ${factPath} and relation ${relationPath}`);
  }
}

console.log(
  `Knowledge catalog verification passed (${files.length} catalogs, ${factIdsGlobal.size} facts, ${relationIdsGlobal.size} relations).`,
);
