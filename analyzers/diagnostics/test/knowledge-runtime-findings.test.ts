import { describe, expect, it } from "vitest";
import { knowledgeRuntimeDiagnostics } from "../src/knowledge-runtime-findings.js";
import type { KnowledgeCatalog } from "../../../packages/knowledge/src/index.js";

const catalog: KnowledgeCatalog = {
  schemaVersion: 1,
  sources: [{
    id: "policy",
    title: "Policy",
    url: "project://knowledge/runtime-diagnostics-test",
    authority: "project-policy",
    confidence: "designed",
    retrievedDate: "2026-09-24",
  }],
  facts: [],
  relations: [{
    id: "verified-gates-commit",
    domain: "world-mutation",
    subject: "verified",
    kind: "gates",
    object: "committed",
    classification: "project-policy",
    applicability: { editions: ["bedrock"] },
    sourceIds: ["policy"],
  }],
};

describe("knowledge runtime diagnostics", () => {
  it("emits a violation only from explicit contradictory evidence", () => {
    const findings = knowledgeRuntimeDiagnostics({
      catalog,
      profile: { edition: "bedrock" },
      snapshot: {
        schemaVersion: 1,
        records: [{
          predicate: "committed",
          state: "present",
          confidence: "observed",
          scope: { arenaId: "arena-1", arenaGeneration: 3 },
        }, {
          predicate: "verified",
          state: "absent",
          confidence: "observed",
          scope: { arenaId: "arena-1", arenaGeneration: 3 },
        }],
      },
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]?.code).toBe("KNOWLEDGE_RELATION_VIOLATION");
    expect(findings[0]?.severity).toBe("medium");
  });

  it("does not treat missing evidence as explicit absence", () => {
    const findings = knowledgeRuntimeDiagnostics({
      catalog,
      profile: { edition: "bedrock" },
      snapshot: {
        schemaVersion: 1,
        records: [{
          predicate: "committed",
          state: "present",
          confidence: "observed",
          scope: { arenaId: "arena-1", arenaGeneration: 4 },
        }],
      },
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]?.code).toBe("KNOWLEDGE_EVIDENCE_GAP");
    expect(findings[0]?.severity).toBe("info");
  });

  it("honors critical severity only for explicit violations", () => {
    const criticalCatalog: KnowledgeCatalog = {
      ...catalog,
      relations: [{
        ...catalog.relations![0]!,
        diagnosticSeverity: "critical",
      }],
    };

    const violation = knowledgeRuntimeDiagnostics({
      catalog: criticalCatalog,
      profile: { edition: "bedrock" },
      snapshot: {
        schemaVersion: 1,
        records: [{
          predicate: "committed",
          state: "present",
          confidence: "observed",
        }, {
          predicate: "verified",
          state: "absent",
          confidence: "observed",
        }],
      },
    });
    expect(violation[0]?.severity).toBe("critical");

    const unknown = knowledgeRuntimeDiagnostics({
      catalog: criticalCatalog,
      profile: { edition: "bedrock" },
      snapshot: {
        schemaVersion: 1,
        records: [{
          predicate: "committed",
          state: "present",
          confidence: "observed",
        }],
      },
    });
    expect(unknown[0]?.severity).toBe("info");
  });
});
