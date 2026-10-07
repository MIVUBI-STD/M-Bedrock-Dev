import { describe, expect, it } from "vitest";
import { knowledgeIdsForRequirement } from "../src/inspection/gameplay-scenario-knowledge.js";

describe("gameplay scenario knowledge selection", () => {
  it("selects only exact knowledge records relevant to the scenario domains", () => {
    const requirement = {
      id: "knowledge:s1:platform-constraints",
      scenarioId: "s1",
      domain: "platform-constraints" as const,
      reason: "Need platform semantics.",
      capabilityIds: ["platform-knowledge-applicability"],
      dependsOnRequirementIds: [],
      subjectIds: [],
      componentIds: [],
    };
    const requirements = [
      requirement,
      {
        ...requirement,
        id: "knowledge:s1:chunk-simulation",
        domain: "chunk-simulation" as const,
      },
    ];

    const world = {
      platformKnowledge: {
        profileResolved: true,
        profileSource: "target",
        claims: [
          {
            relationId: "chunks.relevant",
            domain: "chunks",
            kind: "requires",
            subject: "simulation",
            object: "loaded-area",
            status: "satisfied",
            message: "Relevant.",
            knowledgeSourceIds: [],
            evidenceSourceIds: [],
            sources: [],
          },
          {
            relationId: "inventory.unrelated",
            domain: "inventory",
            kind: "requires",
            subject: "slot",
            object: "validity",
            status: "satisfied",
            message: "Unrelated.",
            knowledgeSourceIds: [],
            evidenceSourceIds: [],
            sources: [],
          },
          {
            relationId: "chunks.unknown",
            domain: "chunks",
            kind: "requires",
            subject: "simulation",
            object: "runtime-state",
            status: "unknown",
            message: "Not decisive.",
            knowledgeSourceIds: [],
            evidenceSourceIds: [],
            sources: [],
          },
        ],
      },
    } as any;

    expect(
      knowledgeIdsForRequirement(
        world,
        requirement,
        requirements,
      ),
    ).toEqual(["chunks.relevant"]);
  });
});
