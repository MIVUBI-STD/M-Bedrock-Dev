import {
  KNOWLEDGE_AUTHORITY_SET,
  KNOWLEDGE_CLASSIFICATION_SET,
  KNOWLEDGE_CONFIDENCE_SET,
  KNOWLEDGE_DOMAIN_SET,
  KNOWLEDGE_EDITION_SET,
  KNOWLEDGE_RELATION_KIND_SET,
} from "./registry.js";
import type { KnowledgeCatalog, KnowledgeSource } from "./types.js";

function validSourceUrl(source: KnowledgeSource): boolean {
  if (source.authority === "project-policy") {
    return source.url.startsWith("project://") || source.url.startsWith("https://");
  }
  return source.url.startsWith("https://");
}

function validateApplicability(
  label: string,
  applicability: KnowledgeCatalog["facts"][number]["applicability"],
  errors: string[],
): void {
  if (!Array.isArray(applicability.editions) || applicability.editions.length === 0) {
    errors.push(`${label} requires at least one edition.`);
  } else {
    for (const edition of applicability.editions) {
      if (!KNOWLEDGE_EDITION_SET.has(edition)) {
        errors.push(`${label} has unknown edition: ${edition}`);
      }
    }
  }

  for (const experiment of applicability.experiments ?? []) {
    if (!experiment.trim()) errors.push(`${label} has empty experiment id.`);
  }

  const versions = applicability.versions;
  if (!versions) return;
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

  if (!Array.isArray(catalog.sources)) errors.push("Knowledge catalog sources must be an array.");
  if (!Array.isArray(catalog.facts)) errors.push("Knowledge catalog facts must be an array.");

  const sourceIds = new Set<string>();
  for (const source of catalog.sources ?? []) {
    if (!source.id.trim()) errors.push("Knowledge source requires id.");
    if (sourceIds.has(source.id)) errors.push(`Duplicate knowledge source id: ${source.id}`);
    sourceIds.add(source.id);

    if (!source.title.trim()) errors.push(`Knowledge source requires title: ${source.id}`);
    if (!KNOWLEDGE_AUTHORITY_SET.has(source.authority)) {
      errors.push(`Knowledge source has unknown authority: ${source.id}`);
    }
    if (!KNOWLEDGE_CONFIDENCE_SET.has(source.confidence)) {
      errors.push(`Knowledge source has unknown confidence: ${source.id}`);
    }
    if (!validSourceUrl(source)) {
      errors.push(`Knowledge source has invalid URL scheme for authority: ${source.id}`);
    }
    if (!source.retrievedDate.trim()) {
      errors.push(`Knowledge source requires retrievedDate: ${source.id}`);
    }
  }

  const projectPolicySources = new Set(
    (catalog.sources ?? [])
      .filter((source) => source.authority === "project-policy")
      .map((source) => source.id),
  );

  const factIds = new Set<string>();
  for (const fact of catalog.facts ?? []) {
    if (!fact.id.trim()) errors.push("Knowledge fact requires id.");
    if (factIds.has(fact.id)) errors.push(`Duplicate knowledge fact id: ${fact.id}`);
    factIds.add(fact.id);

    if (!KNOWLEDGE_DOMAIN_SET.has(fact.domain)) {
      errors.push(`Knowledge fact ${fact.id} has unknown domain: ${fact.domain}`);
    }
    if (!fact.subject.trim()) errors.push(`Knowledge fact requires subject: ${fact.id}`);
    if (!fact.statement.trim()) errors.push(`Knowledge fact requires statement: ${fact.id}`);
    if (
      fact.classification !== undefined &&
      !KNOWLEDGE_CLASSIFICATION_SET.has(fact.classification)
    ) {
      errors.push(`Knowledge fact ${fact.id} has unknown classification: ${fact.classification}`);
    }

    validateApplicability(`Knowledge fact ${fact.id}`, fact.applicability, errors);

    if (!Array.isArray(fact.sourceIds) || fact.sourceIds.length === 0) {
      errors.push(`Knowledge fact has no source: ${fact.id}`);
    }
    for (const sourceId of fact.sourceIds ?? []) {
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
      !fact.sourceIds.some((sourceId) => projectPolicySources.has(sourceId))
    ) {
      errors.push(
        `Project-policy knowledge fact requires project-policy provenance: ${fact.id}`,
      );
    }
  }

  const relationIds = new Set<string>();
  for (const relation of catalog.relations ?? []) {
    if (!relation.id.trim()) errors.push("Knowledge relation requires id.");
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
    if (!relation.subject.trim() || !relation.object.trim()) {
      errors.push(`Knowledge relation requires subject/object: ${relation.id}`);
    }

    validateApplicability(`Knowledge relation ${relation.id}`, relation.applicability, errors);

    if (!Array.isArray(relation.sourceIds) || relation.sourceIds.length === 0) {
      errors.push(`Knowledge relation has no source: ${relation.id}`);
    }
    for (const sourceId of relation.sourceIds ?? []) {
      if (!sourceIds.has(sourceId)) {
        errors.push(`Knowledge relation ${relation.id} references missing source ${sourceId}`);
      }
    }
    if (
      relation.classification === "project-policy" &&
      !relation.sourceIds.some((sourceId) => projectPolicySources.has(sourceId))
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
