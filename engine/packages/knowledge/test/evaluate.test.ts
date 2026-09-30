import { describe, expect, it } from "vitest";
import {
  assessKnowledgeRelations,
  validationPlanFromAssessments,
  type KnowledgeCatalog,
} from "../src/index.js";

const catalog: KnowledgeCatalog = {
  schemaVersion: 1,
  sources: [{
    id: "policy",
    title: "Policy",
    url: "project://knowledge/evaluator-test",
    authority: "project-policy",
    confidence: "designed",
    retrievedDate: "2026-09-24",
  }],
  facts: [],
  relations: [{
    id: "verify-gates-commit",
    domain: "world-mutation",
    subject: "verified-state",
    kind: "gates",
    object: "committed-state",
    classification: "project-policy",
    applicability: { editions: ["bedrock"] },
    sourceIds: ["policy"],
  }, {
    id: "cleanup-restores-baseline",
    domain: "arena-cleanup",
    subject: "cleanup-complete",
    kind: "restores",
    object: "arena-baseline",
    classification: "project-policy",
    applicability: { editions: ["bedrock"] },
    sourceIds: ["policy"],
  }],
};

describe("knowledge relation evaluator", () => {
  it("reports an explicit gate violation without treating unknown as absent", () => {
    const assessments = assessKnowledgeRelations(
      catalog,
      { edition: "bedrock" },
      {
        "committed-state": { state: "present", sourceIds: ["runtime:a"] },
        "verified-state": { state: "absent", sourceIds: ["runtime:b"] },
        "cleanup-complete": { state: "present" },
      },
    );

    expect(assessments.find((item) => item.relationId === "verify-gates-commit")?.status)
      .toBe("violation");
    expect(assessments.find((item) => item.relationId === "cleanup-restores-baseline")?.status)
      .toBe("unknown");
  });

  it("turns violations and evidence gaps into future validation cases", () => {
    const assessments = assessKnowledgeRelations(
      catalog,
      { edition: "bedrock" },
      {
        "committed-state": { state: "present" },
        "verified-state": { state: "absent" },
        "cleanup-complete": { state: "present" },
      },
    );
    const plan = validationPlanFromAssessments(assessments);
    expect(plan).toHaveLength(2);
    expect(plan.some((item) => item.priority === "high")).toBe(true);
    expect(plan.some((item) => item.strategy === "repeatability")).toBe(true);
  });
});
