import { describe, expect, it } from "vitest";
import {
  buildGameplayAuditSurfaces,
  evaluateGameplayAuditCoverage,
} from "../src/index.js";
import type {
  GameplayIntentModel,
} from "../../gameplay-intent/src/index.js";

const model: GameplayIntentModel = {
  schemaVersion: 1,
  id: "audit-coverage",
  artifactId: "artifact:v1",
  evidence: [],
  nodes: [
    {
      id: "game:root",
      kind: "game",
      label: "Root",
      status: "authored",
      evidenceIds: [],
    },
    {
      id: "objective:flag",
      kind: "objective",
      label: "Flag",
      status: "authored",
      evidenceIds: [],
    },
    {
      id: "lifecycle:retry",
      kind: "lifecycle",
      label: "Retry",
      status: "authored",
      evidenceIds: [],
    },
  ],
  edges: [],
  invariants: [],
  unknowns: [],
};

describe("gameplay audit coverage", () => {
  it("builds a deterministic inventory of gameplay surfaces", () => {
    expect(buildGameplayAuditSurfaces(model)).toEqual([
      {
        subjectId: "lifecycle:retry",
        kind: "lifecycle",
        label: "Retry",
      },
      {
        subjectId: "objective:flag",
        kind: "objective",
        label: "Flag",
      },
    ]);
  });

  it("fails when a gameplay surface is silently skipped", () => {
    const result = evaluateGameplayAuditCoverage(
      model,
      [{
        subjectId: "objective:flag",
        status: "checked",
      }],
    );

    expect(result.disposition).toBe("incomplete");
    expect(result.missingSubjectIds).toEqual([
      "lifecycle:retry",
    ]);
  });

  it("is complete only when every gameplay surface has one explicit result", () => {
    const result = evaluateGameplayAuditCoverage(
      model,
      [
        {
          subjectId: "objective:flag",
          status: "checked",
          candidateIds: ["candidate:flag"],
        },
        {
          subjectId: "lifecycle:retry",
          status: "blocked",
          reason: "Expected retry behavior is not grounded in the selected artifact.",
        },
      ],
    );

    expect(result.disposition).toBe("complete");
  });

  it("requires a reason for blocked coverage", () => {
    const result = evaluateGameplayAuditCoverage(
      model,
      [
        {
          subjectId: "objective:flag",
          status: "checked",
        },
        {
          subjectId: "lifecycle:retry",
          status: "blocked",
        },
      ],
    );

    expect(result.disposition).toBe("incomplete");
  });
});
