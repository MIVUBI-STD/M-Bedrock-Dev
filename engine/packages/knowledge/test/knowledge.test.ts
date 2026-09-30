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

  it("requires explicit project-policy provenance for design rules", () => {
    const policyCatalog: KnowledgeCatalog = {
      schemaVersion: 1,
      sources: [{
        id: "policy",
        title: "Project Policy",
        url: "https://github.com/MIVUBI-STD/M-Bedrock-Dev/policy",
        authority: "project-policy",
        confidence: "designed",
        retrievedDate: "2026-09-23",
      }],
      facts: [{
        id: "coverage-policy",
        domain: "chunks",
        subject: "coverage-radius",
        statement: "fixture",
        classification: "project-policy",
        applicability: { editions: ["bedrock"] },
        sourceIds: ["policy"],
        capabilityTags: ["chunk-coverage"],
        riskSurfaces: ["chunk-lifecycle"],
      }],
    };
    expect(validateKnowledgeCatalog(policyCatalog)).toEqual([]);

    expect(validateKnowledgeCatalog({
      ...policyCatalog,
      sources: [{
        ...policyCatalog.sources[0]!,
        authority: "official",
        confidence: "documented",
      }],
    })).toEqual([
      "Project-policy knowledge fact requires project-policy provenance: coverage-policy",
    ]);
  });

  it("accepts open assumptions as explicit non-guarantees", () => {
    const assumptionCatalog: KnowledgeCatalog = {
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
        id: "assumption",
        domain: "chunks",
        subject: "spectator-loading",
        statement: "Runtime proof required.",
        classification: "open-assumption",
        applicability: { editions: ["bedrock"] },
        sourceIds: ["official"],
        capabilityTags: ["runtime-proof"],
        riskSurfaces: ["chunk-lifecycle"],
      }],
    };
    expect(validateKnowledgeCatalog(assumptionCatalog)).toEqual([]);
  });

  it("builds edition-specific effective knowledge", () => {
    expect(effectiveKnowledge(catalog, { edition: "bedrock" }).map((fact) => fact.id))
      .toEqual(["bedrock-only"]);
    expect(effectiveKnowledge(catalog, { edition: "education" }).map((fact) => fact.id))
      .toEqual(["edu-only"]);
  });
});
