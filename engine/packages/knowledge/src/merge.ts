import type {
  KnowledgeCatalog,
  KnowledgeSource,
} from "./types.js";
import { validateKnowledgeCatalog } from "./validate.js";

function sameSource(a: KnowledgeSource, b: KnowledgeSource): boolean {
  return a.url === b.url &&
    a.authority === b.authority &&
    a.confidence === b.confidence;
}

export function mergeKnowledgeCatalogs(
  catalogs: readonly KnowledgeCatalog[],
): KnowledgeCatalog {
  const sources = new Map<string, KnowledgeSource>();

  for (const catalog of catalogs) {
    for (const source of catalog.sources) {
      const existing = sources.get(source.id);
      if (!existing) {
        sources.set(source.id, source);
        continue;
      }
      if (!sameSource(existing, source)) {
        throw new Error(
          `Conflicting knowledge source id ${source.id}: provenance metadata differs.`,
        );
      }
    }
  }

  const merged: KnowledgeCatalog = {
    schemaVersion: 1,
    sources: [...sources.values()].sort((a, b) => a.id.localeCompare(b.id)),
    facts: catalogs.flatMap((catalog) => catalog.facts),
    relations: catalogs.flatMap((catalog) => catalog.relations ?? []),
  };

  const errors = validateKnowledgeCatalog(merged);
  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }

  return merged;
}
