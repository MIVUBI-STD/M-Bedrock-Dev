import { describe, expect, it } from "vitest";
import {
  buildGameplayContract,
  type GameplayIntentModel,
} from "../src/index.js";

function model(
  scope: "selected-artifact" | "external-reference",
): GameplayIntentModel {
  return {
    schemaVersion: 1,
    id: "contract",
    artifactId: "artifact:v1.1.1",
    evidence: [{
      id: "e:intent",
      origin: "source-code",
      locator: "behavior_packs/demo/scripts/game.js",
      summary: "Objective rule.",
      scope,
    }],
    nodes: [{
      id: "objective:flag",
      kind: "objective",
      label: "Flag",
      status: "authored",
      evidenceIds: ["e:intent"],
    }],
    edges: [],
    invariants: [{
      id: "inv:flag",
      statement: "The flag remains completable.",
      strength: "must",
      status: "authored",
      subjectIds: ["objective:flag"],
      evidenceIds: ["e:intent"],
    }],
    unknowns: [],
  };
}

describe("scoped Gameplay Contract", () => {
  it("is ready from grounded evidence inside the selected map artifact", () => {
    const contract = buildGameplayContract(
      model("selected-artifact"),
      { subjectIds: ["objective:flag"] },
    );

    expect(contract.artifactId).toBe("artifact:v1.1.1");
    expect(contract.evidenceScope).toBe("selected-artifact-only");
    expect(contract.readiness.disposition).toBe("ready");
  });

  it("blocks external/reference evidence even when it describes the same mechanic", () => {
    const contract = buildGameplayContract(
      model("external-reference"),
      { subjectIds: ["objective:flag"] },
    );

    expect(contract.readiness.disposition).toBe("blocked");
    expect(contract.authorityEvidenceIds).toEqual([]);
  });

  it("blocks when the model is not bound to one selected artifact", () => {
    const current = model("selected-artifact");
    const contract = buildGameplayContract(
      {
        ...current,
        artifactId: undefined,
      },
      { subjectIds: ["objective:flag"] },
    );

    expect(contract.readiness.disposition).toBe("blocked");
  });
});
