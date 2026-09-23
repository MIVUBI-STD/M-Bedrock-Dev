import type { KnowledgeCatalog } from "./types.js";

export function validateKnowledgeCatalog(
  catalog: KnowledgeCatalog,
): string[] {
  const errors: string[] = [];
  if (catalog.schemaVersion !== 1) errors.push("Knowledge catalog schemaVersion must be 1.");

  const sourceIds = new Set<string>();
  for (const source of catalog.sources) {
    if (!source.id.trim()) errors.push("Knowledge source requires id.");
    if (sourceIds.has(source.id)) errors.push(`Duplicate knowledge source id: ${source.id}`);
    sourceIds.add(source.id);
    if (!source.url.startsWith("https://")) {
      errors.push(`Knowledge source must use https URL: ${source.id}`);
    }
  }

  const projectPolicySources = new Set(
    catalog.sources
      .filter((source) => source.authority === "project-policy")
      .map((source) => source.id),
  );

  const factIds = new Set<string>();
  for (const fact of catalog.facts) {
    if (factIds.has(fact.id)) errors.push(`Duplicate knowledge fact id: ${fact.id}`);
    factIds.add(fact.id);
    if (fact.sourceIds.length === 0) errors.push(`Knowledge fact has no source: ${fact.id}`);
    for (const sourceId of fact.sourceIds) {
      if (!sourceIds.has(sourceId)) {
        errors.push(`Knowledge fact ${fact.id} references missing source ${sourceId}`);
      }
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
    if (relationIds.has(relation.id)) {
      errors.push(`Duplicate knowledge relation id: ${relation.id}`);
    }
    relationIds.add(relation.id);
    if (!relation.subject.trim() || !relation.object.trim()) {
      errors.push(`Knowledge relation requires subject/object: ${relation.id}`);
    }
    if (relation.sourceIds.length === 0) {
      errors.push(`Knowledge relation has no source: ${relation.id}`);
    }
    for (const sourceId of relation.sourceIds) {
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

  return errors;
}
