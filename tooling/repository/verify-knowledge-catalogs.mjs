import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

function stringRegistry(constantName) {
  const source = readFileSync("packages/knowledge/src/registry.ts", "utf8");
  const match = source.match(
    new RegExp(
      `export const ${constantName} = \\[([\\s\\S]*?)\\] as const`,
    ),
  );
  if (!match) throw new Error(`Unable to read ${constantName} from knowledge registry`);
  return new Set([...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]));
}

const domains = stringRegistry("KNOWLEDGE_DOMAINS");
const relationKinds = stringRegistry("KNOWLEDGE_RELATION_KINDS");
const classifications = stringRegistry("KNOWLEDGE_CLASSIFICATIONS");
const authorities = stringRegistry("KNOWLEDGE_AUTHORITIES");
const confidences = stringRegistry("KNOWLEDGE_CONFIDENCES");
const editions = stringRegistry("KNOWLEDGE_EDITIONS");
const diagnosticSeverities = stringRegistry("KNOWLEDGE_DIAGNOSTIC_SEVERITIES");

const directory = "knowledge";
const files = readdirSync(directory)
  .filter((name) => name.endsWith(".json"))
  .map((name) => join(directory, name))
  .sort();

const sourceIdsGlobal = new Map();
const factIdsGlobal = new Map();
const relationIdsGlobal = new Map();

function validUrl(source) {
  if (typeof source.url !== "string") return false;
  if (source.authority === "project-policy") {
    return source.url.startsWith("project://") || source.url.startsWith("https://");
  }
  return source.url.startsWith("https://");
}

function validateApplicability(path, id, applicability) {
  if (!Array.isArray(applicability?.editions) || applicability.editions.length === 0) {
    throw new Error(`${path}: ${id} lacks editions`);
  }
  for (const edition of applicability.editions) {
    if (!editions.has(edition)) {
      throw new Error(`${path}: ${id} uses unknown edition ${edition}`);
    }
  }
  if (
    applicability.experiments !== undefined &&
    !Array.isArray(applicability.experiments)
  ) {
    throw new Error(`${path}: ${id} experiments must be an array`);
  }
  if (
    applicability.versions?.scriptModuleVersion &&
    !applicability.versions?.scriptModule
  ) {
    throw new Error(`${path}: ${id} has scriptModuleVersion without scriptModule`);
  }
}

for (const path of files) {
  const catalog = JSON.parse(readFileSync(path, "utf8"));
  if (catalog.schemaVersion !== 1) throw new Error(`${path}: schemaVersion must be 1`);
  if (!Array.isArray(catalog.sources)) throw new Error(`${path}: sources must be an array`);
  if (!Array.isArray(catalog.facts)) throw new Error(`${path}: facts must be an array`);
  if (catalog.relations !== undefined && !Array.isArray(catalog.relations)) {
    throw new Error(`${path}: relations must be an array`);
  }

  const sources = new Set();
  for (const source of catalog.sources) {
    if (
      !source.id ||
      !validUrl(source) ||
      !authorities.has(source.authority) ||
      !confidences.has(source.confidence)
    ) {
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
  for (const fact of catalog.facts) {
    if (!fact.id || ids.has(fact.id)) throw new Error(`${path}: invalid/duplicate fact id`);
    ids.add(fact.id);

    const previous = factIdsGlobal.get(fact.id);
    if (previous) throw new Error(`${path}: fact ${fact.id} duplicates ${previous}`);
    factIdsGlobal.set(fact.id, path);

    if (!domains.has(fact.domain)) {
      throw new Error(`${path}: fact ${fact.id} has unknown domain ${fact.domain}`);
    }
    if (!fact.subject || !fact.statement) {
      throw new Error(`${path}: fact ${fact.id} lacks subject/statement`);
    }
    if (fact.classification !== undefined && !classifications.has(fact.classification)) {
      throw new Error(
        `${path}: fact ${fact.id} has unknown classification ${fact.classification}`,
      );
    }
    validateApplicability(path, fact.id, fact.applicability);

    if (!Array.isArray(fact.sourceIds) || fact.sourceIds.length === 0) {
      throw new Error(`${path}: fact ${fact.id} has no provenance`);
    }
    for (const sourceId of fact.sourceIds) {
      if (!sources.has(sourceId)) throw new Error(`${path}: missing source ${sourceId}`);
    }
    if (
      fact.classification === "project-policy" &&
      !fact.sourceIds.some((sourceId) =>
        catalog.sources.some(
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

    if (!domains.has(relation.domain)) {
      throw new Error(
        `${path}: relation ${relation.id} has unknown domain ${relation.domain}`,
      );
    }
    if (!relationKinds.has(relation.kind)) {
      throw new Error(
        `${path}: relation ${relation.id} has unknown kind ${relation.kind}`,
      );
    }
    if (
      relation.classification !== undefined &&
      !classifications.has(relation.classification)
    ) {
      throw new Error(
        `${path}: relation ${relation.id} has unknown classification ${relation.classification}`,
      );
    }
    if (
      relation.diagnosticSeverity !== undefined &&
      !diagnosticSeverities.has(relation.diagnosticSeverity)
    ) {
      throw new Error(
        `${path}: relation ${relation.id} has unknown diagnosticSeverity ${relation.diagnosticSeverity}`,
      );
    }
    const causalConsequences = new Set(
      Array.isArray(relation.causalConsequences)
        ? relation.causalConsequences
        : [],
    );
    for (const risk of Object.keys(relation.causalCorroborators ?? {})) {
      if (!causalConsequences.has(risk)) {
        throw new Error(
          `${path}: relation ${relation.id} references corroboration risk not listed in causalConsequences: ${risk}`,
        );
      }
    }
    for (const risk of Object.keys(relation.causalOutcomePredicates ?? {})) {
      if (!causalConsequences.has(risk)) {
        throw new Error(
          `${path}: relation ${relation.id} references outcome risk not listed in causalConsequences: ${risk}`,
        );
      }
    }

    if (
      relation.causalOutcomePredicates !== undefined &&
      (
        typeof relation.causalOutcomePredicates !== "object" ||
        relation.causalOutcomePredicates === null ||
        Array.isArray(relation.causalOutcomePredicates)
      )
    ) {
      throw new Error(
        `${path}: relation ${relation.id} causalOutcomePredicates must be an object`,
      );
    }
    for (const [risk, predicates] of Object.entries(
      relation.causalOutcomePredicates ?? {},
    )) {
      if (!risk.trim() || !Array.isArray(predicates) || predicates.length === 0) {
        throw new Error(
          `${path}: relation ${relation.id} has invalid outcome ${risk}`,
        );
      }
      for (const predicate of predicates) {
        if (typeof predicate !== "string" || predicate.trim().length === 0) {
          throw new Error(
            `${path}: relation ${relation.id} has empty outcome predicate`,
          );
        }
      }
    }

    if (
      relation.causalCorroborators !== undefined &&
      (
        typeof relation.causalCorroborators !== "object" ||
        relation.causalCorroborators === null ||
        Array.isArray(relation.causalCorroborators)
      )
    ) {
      throw new Error(
        `${path}: relation ${relation.id} causalCorroborators must be an object`,
      );
    }
    for (const [risk, predicates] of Object.entries(
      relation.causalCorroborators ?? {},
    )) {
      if (!risk.trim() || !Array.isArray(predicates) || predicates.length === 0) {
        throw new Error(
          `${path}: relation ${relation.id} has invalid corroborator ${risk}`,
        );
      }
      for (const predicate of predicates) {
        if (typeof predicate !== "string" || predicate.trim().length === 0) {
          throw new Error(
            `${path}: relation ${relation.id} has empty corroborator predicate`,
          );
        }
      }
    }

    if (
      relation.causalConsequences !== undefined &&
      !Array.isArray(relation.causalConsequences)
    ) {
      throw new Error(
        `${path}: relation ${relation.id} causalConsequences must be an array`,
      );
    }
    for (const consequence of relation.causalConsequences ?? []) {
      if (typeof consequence !== "string" || consequence.trim().length === 0) {
        throw new Error(
          `${path}: relation ${relation.id} has empty causal consequence`,
        );
      }
    }
    if (!relation.subject || !relation.object) {
      throw new Error(`${path}: relation ${relation.id} lacks subject/object`);
    }
    validateApplicability(path, relation.id, relation.applicability);

    if (!Array.isArray(relation.sourceIds) || relation.sourceIds.length === 0) {
      throw new Error(`${path}: relation ${relation.id} has no provenance`);
    }
    for (const sourceId of relation.sourceIds) {
      if (!sources.has(sourceId)) throw new Error(`${path}: missing relation source ${sourceId}`);
    }
    if (
      relation.classification === "project-policy" &&
      !relation.sourceIds.some((sourceId) =>
        catalog.sources.some(
          (source) => source.id === sourceId && source.authority === "project-policy",
        )
      )
    ) {
      throw new Error(
        `${path}: project-policy relation ${relation.id} lacks project-policy source`,
      );
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
