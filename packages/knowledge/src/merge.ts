import type { KnowledgeCatalog } from "./types.js";
import { validateKnowledgeCatalog } from "./validate.js";

export function mergeKnowledgeCatalogs(
  catalogs: readonly KnowledgeCatalog[],
): KnowledgeCatalog {
  const merged: KnowledgeCatalog = {
    schemaVersion: 1,
    sources: catalogs.flatMap((catalog) => catalog.sources),
    facts: catalogs.flatMap((catalog) => catalog.facts),
    relations: catalogs.flatMap((catalog) => catalog.relations ?? []),
  };

  const errors = validateKnowledgeCatalog(merged);
  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }

  return merged;
}
