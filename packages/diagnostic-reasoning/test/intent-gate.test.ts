import { describe, expect, it } from "vitest";
import {
  gateIntentDiagnostic,
} from "../src/index.js";
import type {
  GameplayIntentModel,
} from "../../gameplay-intent/src/index.js";

function model(
  invariantStatus: "authored" | "inferred",
  withUnknown = false,
): GameplayIntentModel {
  return {
    schemaVersion: 1,
    id: "arena-game",
    evidence: [{
      id: "e:intent",
      origin: "source-code",
      locator: "src/session.ts",
      summary: "Session source defines cleanup behavior.",
    }],
    nodes: [{
      id: "lifecycle:cleanup",
      kind: "lifecycle",
      label: "Cleanup",
      status: invariantStatus,
      evidenceIds: ["e:intent"],
    }],
    edges: [],
    invariants: [{
      id: "inv:cleanup",
      statement: "Cleanup returns the arena to reusable state.",
      strength: "must",
      status: invariantStatus,
      subjectIds: ["lifecycle:cleanup"],
      evidenceIds: ["e:intent"],
    }],
    unknowns: withUnknown ? [{
      id: "unknown:cleanup-owner",
      question: "Which subsystem owns final cleanup?",
      blockedSubjectIds: ["lifecycle:cleanup"],
    }] : [],
  };
}

describe("intent diagnostic gate", () => {
  it("allows confirmed defect only against authored intent", () => {
    expect(gateIntentDiagnostic({
      intent: model("authored"),
      subjectIds: ["lifecycle:cleanup"],
      observationEvidenceIds: ["runtime:arena-not-reusable"],
      contradictionEvidenceIds: ["trace:cleanup-complete-but-state-dirty"],
    }).disposition).toBe("confirmed-defect");
  });

  it("limits contradiction against inferred intent to probable defect", () => {
    expect(gateIntentDiagnostic({
      intent: model("inferred"),
      subjectIds: ["lifecycle:cleanup"],
      observationEvidenceIds: ["runtime:arena-not-reusable"],
      contradictionEvidenceIds: ["trace:cleanup-complete-but-state-dirty"],
    }).disposition).toBe("probable-defect");
  });

  it("blocks defect classification while intent is ambiguous", () => {
    expect(gateIntentDiagnostic({
      intent: model("authored", true),
      subjectIds: ["lifecycle:cleanup"],
      observationEvidenceIds: ["runtime:arena-not-reusable"],
      contradictionEvidenceIds: ["trace:cleanup-complete-but-state-dirty"],
    }).disposition).toBe("ambiguous-intent");
  });

  it("can classify directly evidenced designed behavior", () => {
    expect(gateIntentDiagnostic({
      intent: model("authored"),
      subjectIds: ["lifecycle:cleanup"],
      observationEvidenceIds: ["runtime:cleanup-delay"],
      designMatchEvidenceIds: ["source:cleanup-delay-policy"],
    }).disposition).toBe("designed-behavior");
  });
});
