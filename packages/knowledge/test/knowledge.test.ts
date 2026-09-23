import { describe, expect, it } from "vitest";
import {
  effectiveKnowledge,
  validateKnowledgeCatalog,
  type KnowledgeCatalog,
} from "../src/index.js";

const catalog: KnowledgeCatalog = {
  schemaVersion: 1,
  sources: [{
    id: "official",
    title: "Official",
    url: "https://learn.microsoft.com/example",
    authority: "official",
    confidence: "documented",
    retrievedDate: "2026-09-23",
  }],
  facts: [{
    id: "bedrock-only",
    domain: "commands",
    subject: "teleport",
    statement: "fixture",
    applicability: { editions: ["bedrock"] },
    sourceIds: ["official"],
    capabilityTags: ["command:teleport"],
    riskSurfaces: ["entity-position"],
  }, {
    id: "edu-only",
    domain: "education",
    subject: "npc",
    statement: "fixture",
    applicability: { editions: ["education"] },
    sourceIds: ["official"],
    capabilityTags: ["education:npc"],
    riskSurfaces: ["education-profile"],
  }],
};

describe("knowledge catalog", () => {
  it("validates provenance and IDs", () => {
    expect(validateKnowledgeCatalog(catalog)).toEqual([]);
  });

  it("builds edition-specific effective knowledge", () => {
    expect(effectiveKnowledge(catalog, { edition: "bedrock" }).map((fact) => fact.id))
      .toEqual(["bedrock-only"]);
    expect(effectiveKnowledge(catalog, { edition: "education" }).map((fact) => fact.id))
      .toEqual(["edu-only"]);
  });
});
