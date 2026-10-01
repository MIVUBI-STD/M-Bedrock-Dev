import { describe, expect, it } from "vitest";
import {
  gateIntentDiagnostic,
} from "../src/index.js";
import type {
  GameplayIntentModel,
} from "../../gameplay-intent/src/index.js";

function model(
  invariantStatus: "authored" | "inferred" = "authored",
  withUnknown = false,
  evidenceScope:
    | "selected-artifact"
    | "external-reference" = "selected-artifact",
): GameplayIntentModel {
  return {
    schemaVersion: 1,
    id: "arena-game",
    artifactId: "artifact:v1",
    evidence: [{
      id: "e:intent",
      origin: "source-code",
      locator: "behavior_packs/demo/scripts/session.js",
      summary: "Cleanup behavior.",
      scope: evidenceScope,
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
  it("confirms a contradiction against selected-artifact authored intent", () => {
    expect(gateIntentDiagnostic({
      intent: model(),
      subjectIds: ["lifecycle:cleanup"],
      observationEvidenceIds: ["runtime:arena-not-reusable"],
      contradictionEvidenceIds: ["trace:cleanup-complete-but-state-dirty"],
    }).disposition).toBe("confirmed-defect");
  });

  it("blocks when expected behavior exists only in external/reference material", () => {
    const result = gateIntentDiagnostic({
      intent: model("authored", false, "external-reference"),
      subjectIds: ["lifecycle:cleanup"],
      observationEvidenceIds: ["runtime:arena-not-reusable"],
      contradictionEvidenceIds: ["trace:cleanup-complete-but-state-dirty"],
    });

    expect(result.disposition).toBe("ambiguous-intent");
  });

  it("blocks when selected-artifact intent is inferred rather than grounded", () => {
    const result = gateIntentDiagnostic({
      intent: model("inferred"),
      subjectIds: ["lifecycle:cleanup"],
      observationEvidenceIds: ["runtime:arena-not-reusable"],
      contradictionEvidenceIds: ["trace:cleanup-complete-but-state-dirty"],
    });

    expect(result.disposition).toBe("ambiguous-intent");
  });

  it("blocks while material intent inside the selected artifact is unresolved", () => {
    expect(gateIntentDiagnostic({
      intent: model("authored", true),
      subjectIds: ["lifecycle:cleanup"],
      observationEvidenceIds: ["runtime:arena-not-reusable"],
      contradictionEvidenceIds: ["trace:cleanup-complete-but-state-dirty"],
    }).disposition).toBe("ambiguous-intent");
  });

  it("can classify selected-artifact behavior as designed when direct matching evidence exists", () => {
    expect(gateIntentDiagnostic({
      intent: model(),
      subjectIds: ["lifecycle:cleanup"],
      observationEvidenceIds: ["runtime:cleanup-delay"],
      designMatchEvidenceIds: ["artifact:cleanup-delay-policy"],
    }).disposition).toBe("designed-behavior");
  });

  it("ignores external Game Design rules in normal audit mode", () => {
    const result = gateIntentDiagnostic({
      intent: model(),
      subjectIds: ["lifecycle:cleanup"],
      observationEvidenceIds: ["runtime:arena-not-reusable"],
      contradictionEvidenceIds: ["trace:cleanup-complete-but-state-dirty"],
      resolvedGameDesignRule: {
        designId: "external-design",
        sourceReference: "Technical Docs/design.json",
        authority: "authoritative",
        rule: {
          id: "cleanup",
          statement: "Cleanup is optional.",
          outcome: "allowed",
        },
      },
      gameDesignObservationRelation: "supports-observed",
    });

    expect(result.disposition).toBe("confirmed-defect");
  });

  it("allows external design only in explicit reference/comparison mode", () => {
    const result = gateIntentDiagnostic({
      intent: model(),
      subjectIds: ["lifecycle:cleanup"],
      observationEvidenceIds: ["runtime:cleanup-delay"],
      resolvedGameDesignRule: {
        designId: "external-design",
        sourceReference: "Technical Docs/design.json",
        authority: "authoritative",
        rule: {
          id: "cleanup-delay",
          statement: "Cleanup delay is allowed.",
          outcome: "allowed",
        },
      },
      gameDesignObservationRelation: "supports-observed",
      allowExternalReferenceMode: true,
    });

    expect(result.disposition).toBe("designed-behavior");
  });

  it("requires runtime evidence integrity when runtime proof is required", () => {
    const result = gateIntentDiagnostic({
      intent: model(),
      subjectIds: ["lifecycle:cleanup"],
      observationEvidenceIds: ["runtime:arena-not-reusable"],
      contradictionEvidenceIds: ["trace:cleanup-complete-but-state-dirty"],
      runtimeProofRequired: true,
      runtimeProofEvidenceIds: ["runtime:cleanup-proof"],
      runtimeEvidenceIntegritySatisfied: false,
    });

    expect(result.disposition).toBe("runtime-proof-required");
    expect(result.nextEvidenceNeed).toBe("runtime-evidence-integrity");
  });
});
