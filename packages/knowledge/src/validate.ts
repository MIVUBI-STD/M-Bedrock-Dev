import {
  KNOWLEDGE_AUTHORITY_SET,
  KNOWLEDGE_CLASSIFICATION_SET,
  KNOWLEDGE_CONFIDENCE_SET,
  KNOWLEDGE_DOMAIN_SET,
  KNOWLEDGE_EDITION_SET,
  KNOWLEDGE_DIAGNOSTIC_SEVERITY_SET,
  KNOWLEDGE_RELATION_KIND_SET,
} from "./registry.js";
import type { KnowledgeCatalog, KnowledgeSource } from "./types.js";

function validSourceUrl(source: KnowledgeSource): boolean {
  if (typeof source.url !== "string") return false;
  if (source.authority === "project-policy") {
    return source.url.startsWith("project://") || source.url.startsWith("https://");
  }
  return source.url.startsWith("https://");
}

function validateApplicability(
  label: string,
  applicability: KnowledgeCatalog["facts"][number]["applicability"] | undefined,
  errors: string[],
): void {
  if (!applicability) {
    errors.push(`${label} requires applicability.`);
    return;
  }
  if (!Array.isArray(applicability.editions) || applicability.editions.length === 0) {
    errors.push(`${label} requires at least one edition.`);
  } else {
    for (const edition of applicability.editions) {
      if (!KNOWLEDGE_EDITION_SET.has(edition)) {
        errors.push(`${label} has unknown edition: ${edition}`);
      }
    }
  }

  if (
    applicability.experiments !== undefined &&
    !Array.isArray(applicability.experiments)
  ) {
    errors.push(`${label} experiments must be an array when provided.`);
  } else {
    for (const experiment of applicability.experiments ?? []) {
      if (typeof experiment !== "string" || !experiment.trim()) {
        errors.push(`${label} has empty experiment id.`);
      }
    }
  }

  const versions = applicability.versions;
  if (!versions) return;
  if (typeof versions !== "object" || Array.isArray(versions)) {
    errors.push(`${label} versions must be an object when provided.`);
    return;
  }
  for (const [key, value] of Object.entries(versions)) {
    if (value !== undefined && !String(value).trim()) {
      errors.push(`${label} has empty version field: ${key}`);
    }
  }
  if (versions.scriptModuleVersion && !versions.scriptModule) {
    errors.push(`${label} has scriptModuleVersion without scriptModule.`);
  }
}

export function validateKnowledgeCatalog(
  catalog: KnowledgeCatalog,
): string[] {
  const errors: string[] = [];
  if (catalog.schemaVersion !== 1) {
    errors.push("Knowledge catalog schemaVersion must be 1.");
  }

  const sources = Array.isArray(catalog.sources) ? catalog.sources : [];
  const facts = Array.isArray(catalog.facts) ? catalog.facts : [];
  const relations = Array.isArray(catalog.relations) ? catalog.relations : [];

  if (!Array.isArray(catalog.sources)) errors.push("Knowledge catalog sources must be an array.");
  if (!Array.isArray(catalog.facts)) errors.push("Knowledge catalog facts must be an array.");
  if (catalog.relations !== undefined && !Array.isArray(catalog.relations)) {
    errors.push("Knowledge catalog relations must be an array when provided.");
  }

  const sourceIds = new Set<string>();
  for (const source of sources) {
    if (typeof source.id !== "string" || !source.id.trim()) {
      errors.push("Knowledge source requires id.");
      continue;
    }
    if (sourceIds.has(source.id)) errors.push(`Duplicate knowledge source id: ${source.id}`);
    sourceIds.add(source.id);

    if (typeof source.title !== "string" || !source.title.trim()) {
      errors.push(`Knowledge source requires title: ${source.id}`);
    }
    if (!KNOWLEDGE_AUTHORITY_SET.has(source.authority)) {
      errors.push(`Knowledge source has unknown authority: ${source.id}`);
    }
    if (!KNOWLEDGE_CONFIDENCE_SET.has(source.confidence)) {
      errors.push(`Knowledge source has unknown confidence: ${source.id}`);
    }
    if (!validSourceUrl(source)) {
      errors.push(`Knowledge source has invalid URL scheme for authority: ${source.id}`);
    }
    if (typeof source.retrievedDate !== "string" || !source.retrievedDate.trim()) {
      errors.push(`Knowledge source requires retrievedDate: ${source.id}`);
    }
  }

  const projectPolicySources = new Set(
    sources
      .filter((source) => source.authority === "project-policy")
      .map((source) => source.id),
  );

  const factIds = new Set<string>();
  for (const fact of facts) {
    if (typeof fact.id !== "string" || !fact.id.trim()) {
      errors.push("Knowledge fact requires id.");
      continue;
    }
    if (factIds.has(fact.id)) errors.push(`Duplicate knowledge fact id: ${fact.id}`);
    factIds.add(fact.id);

    if (!KNOWLEDGE_DOMAIN_SET.has(fact.domain)) {
      errors.push(`Knowledge fact ${fact.id} has unknown domain: ${fact.domain}`);
    }
    if (typeof fact.subject !== "string" || !fact.subject.trim()) {
      errors.push(`Knowledge fact requires subject: ${fact.id}`);
    }
    if (typeof fact.statement !== "string" || !fact.statement.trim()) {
      errors.push(`Knowledge fact requires statement: ${fact.id}`);
    }
    if (
      fact.classification !== undefined &&
      !KNOWLEDGE_CLASSIFICATION_SET.has(fact.classification)
    ) {
      errors.push(`Knowledge fact ${fact.id} has unknown classification: ${fact.classification}`);
    }

    validateApplicability(`Knowledge fact ${fact.id}`, fact.applicability, errors);

    const factSourceIds = Array.isArray(fact.sourceIds) ? fact.sourceIds : [];
    if (factSourceIds.length === 0) {
      errors.push(`Knowledge fact has no source: ${fact.id}`);
    }
    for (const sourceId of factSourceIds) {
      if (!sourceIds.has(sourceId)) {
        errors.push(`Knowledge fact ${fact.id} references missing source ${sourceId}`);
      }
    }

    if (!Array.isArray(fact.capabilityTags)) {
      errors.push(`Knowledge fact ${fact.id} capabilityTags must be an array.`);
    }
    if (!Array.isArray(fact.riskSurfaces)) {
      errors.push(`Knowledge fact ${fact.id} riskSurfaces must be an array.`);
    }

    if (
      fact.classification === "project-policy" &&
      !factSourceIds.some((sourceId) => projectPolicySources.has(sourceId))
    ) {
      errors.push(
        `Project-policy knowledge fact requires project-policy provenance: ${fact.id}`,
      );
    }
  }

  const relationIds = new Set<string>();
  for (const relation of relations) {
    if (typeof relation.id !== "string" || !relation.id.trim()) {
      errors.push("Knowledge relation requires id.");
      continue;
    }
    if (relationIds.has(relation.id)) {
      errors.push(`Duplicate knowledge relation id: ${relation.id}`);
    }
    relationIds.add(relation.id);

    if (!KNOWLEDGE_DOMAIN_SET.has(relation.domain)) {
      errors.push(`Knowledge relation ${relation.id} has unknown domain: ${relation.domain}`);
    }
    if (!KNOWLEDGE_RELATION_KIND_SET.has(relation.kind)) {
      errors.push(`Knowledge relation ${relation.id} has unknown kind: ${relation.kind}`);
    }
    if (
      relation.classification !== undefined &&
      !KNOWLEDGE_CLASSIFICATION_SET.has(relation.classification)
    ) {
      errors.push(
        `Knowledge relation ${relation.id} has unknown classification: ${relation.classification}`,
      );
    }
    if (
      relation.diagnosticSeverity !== undefined &&
      !KNOWLEDGE_DIAGNOSTIC_SEVERITY_SET.has(relation.diagnosticSeverity)
    ) {
      errors.push(
        `Knowledge relation ${relation.id} has unknown diagnosticSeverity: ${relation.diagnosticSeverity}`,
      );
    }
    if (
      relation.causalConsequences !== undefined &&
      !Array.isArray(relation.causalConsequences)
    ) {
      errors.push(
        `Knowledge relation ${relation.id} causalConsequences must be an array.`,
      );
    } else {
      for (const consequence of relation.causalConsequences ?? []) {
        if (typeof consequence !== "string" || !consequence.trim()) {
          errors.push(
            `Knowledge relation ${relation.id} has an empty causal consequence.`,
          );
        }
      }
    }
    if (
      typeof relation.subject !== "string" ||
      typeof relation.object !== "string" ||
      !relation.subject.trim() ||
      !relation.object.trim()
    ) {
      errors.push(`Knowledge relation requires subject/object: ${relation.id}`);
    }

    validateApplicability(`Knowledge relation ${relation.id}`, relation.applicability, errors);

    const relationSourceIds = Array.isArray(relation.sourceIds) ? relation.sourceIds : [];
    if (relationSourceIds.length === 0) {
      errors.push(`Knowledge relation has no source: ${relation.id}`);
    }
    for (const sourceId of relationSourceIds) {
      if (!sourceIds.has(sourceId)) {
        errors.push(`Knowledge relation ${relation.id} references missing source ${sourceId}`);
      }
    }
    if (
      relation.classification === "project-policy" &&
      !relationSourceIds.some((sourceId) => projectPolicySources.has(sourceId))
    ) {
      errors.push(
        `Project-policy knowledge relation requires project-policy provenance: ${relation.id}`,
      );
    }
  }

  for (const id of factIds) {
    if (relationIds.has(id)) {
      errors.push(`Knowledge id reused by fact and relation: ${id}`);
    }
  }

  return errors;
}
