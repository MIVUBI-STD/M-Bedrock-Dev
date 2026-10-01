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
  it("requires runtime evidence integrity before runtime-backed defect confirmation", () => {
    const result = gateIntentDiagnostic({
      intent: model("authored"),
      subjectIds: ["lifecycle:cleanup"],
      observationEvidenceIds: ["runtime:arena-not-reusable"],
      contradictionEvidenceIds: ["trace:cleanup-complete-but-state-dirty"],
      runtimeProofRequired: true,
      runtimeProofEvidenceIds: ["runtime:cleanup-proof"],
      runtimeEvidenceIntegritySatisfied: false,
    });

    expect(result.disposition).toBe("runtime-proof-required");
    expect(result.nextEvidenceNeed).toBe("runtime-evidence-integrity");
    expect(result.evidenceIds).toEqual([
      "runtime:arena-not-reusable",
      "runtime:cleanup-proof",
    ]);
  });


  it("treats an explicit Game Design exception as designed behavior", () => {
    const result = gateIntentDiagnostic({
      intent: model("authored"),
      subjectIds: ["combat:team-damage"],
      observationEvidenceIds: ["runtime:friendly-fire"],
      resolvedGameDesignRule: {
        designId: "design:offense",
        sourceReference: "design/game-design.json",
        authority: "authoritative",
        exceptionId: "developer-mode",
        rule: {
          id: "friendly-fire",
          statement: "Same-team damage is forbidden.",
          outcome: "forbidden",
        },
      },
      gameDesignObservationRelation: "contradicts-observed",
    });

    expect(result.disposition).toBe("designed-behavior");
    expect(result.basisDesignRuleIds).toEqual(["friendly-fire"]);
  });

  it("routes matching balance concerns to design review, not a bug", () => {
    const result = gateIntentDiagnostic({
      intent: model("authored"),
      subjectIds: ["objective:flag"],
      observationEvidenceIds: ["runtime:flag-survives"],
      resolvedGameDesignRule: {
        designId: "design:defense",
        sourceReference: "design/game-design.json",
        authority: "authoritative",
        rule: {
          id: "flag-health",
          statement: "The flag has the authored durability profile.",
          outcome: "allowed",
        },
      },
      gameDesignObservationRelation: "supports-observed",
      concernKind: "balance",
    });

    expect(result.disposition).toBe("design-review");
  });

  it("confirms contradiction against authoritative Game Design rule", () => {
    const result = gateIntentDiagnostic({
      intent: model("inferred"),
      subjectIds: ["combat:team-damage"],
      observationEvidenceIds: ["runtime:friendly-fire"],
      contradictionEvidenceIds: ["tester:same-team-damage"],
      resolvedGameDesignRule: {
        designId: "design:offense",
        sourceReference: "design/game-design.json",
        authority: "authoritative",
        rule: {
          id: "friendly-fire",
          statement: "Same-team damage is forbidden.",
          outcome: "forbidden",
        },
      },
      gameDesignObservationRelation: "contradicts-observed",
    });

    expect(result.disposition).toBe("confirmed-defect");
    expect(result.basisDesignEvidenceIds.length).toBeGreaterThan(0);
  });
});
