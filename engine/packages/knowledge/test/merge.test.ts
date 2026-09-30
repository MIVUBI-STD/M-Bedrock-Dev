import { describe, expect, it } from "vitest";
import {
  mergeKnowledgeCatalogs,
  type KnowledgeCatalog,
} from "../src/index.js";

function catalog(url: string): KnowledgeCatalog {
  return {
    schemaVersion: 1,
    sources: [{
      id: "shared",
      title: "Shared official source",
      url,
      authority: "official",
      confidence: "documented",
      retrievedDate: "2026-09-23",
    }],
    facts: [],
  };
}

describe("knowledge catalog merge", () => {
  it("deduplicates identical provenance source ids across domain catalogs", () => {
    const merged = mergeKnowledgeCatalogs([
      catalog("https://learn.microsoft.com/example"),
      catalog("https://learn.microsoft.com/example"),
    ]);
    expect(merged.sources).toHaveLength(1);
  });

  it("rejects the same source id with conflicting provenance", () => {
    expect(() => mergeKnowledgeCatalogs([
      catalog("https://learn.microsoft.com/a"),
      catalog("https://learn.microsoft.com/b"),
    ])).toThrow(/Conflicting knowledge source id/);
  });
});
