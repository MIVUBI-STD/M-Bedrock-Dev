import { describe, expect, it } from "vitest";
import {
  buildGameplayContract,
  type GameplayIntentModel,
} from "../src/index.js";

function model(origin: "game-design-spec" | "source-code"): GameplayIntentModel {
  return {
    schemaVersion: 1,
    id: "contract",
    evidence: [{
      id: "e:intent",
      origin,
      locator:
        origin === "game-design-spec"
          ? "design/game-design.json"
          : "scripts/game.ts",
      summary: "Objective rule.",
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
  it("is ready only when scoped rules have independent design authority", () => {
    expect(buildGameplayContract(
      model("game-design-spec"),
      { subjectIds: ["objective:flag"] },
    ).readiness.disposition).toBe("ready");

    expect(buildGameplayContract(
      model("source-code"),
      { subjectIds: ["objective:flag"] },
    ).readiness.disposition).toBe("blocked");
  });

  it("can bind an authoritative resolved Game Design rule outside invariant projection", () => {
    const contract = buildGameplayContract(
      model("source-code"),
      {
        subjectIds: ["objective:flag"],
        designRuleEvidenceIds: [
          "game-design:flag:rule:reset",
        ],
      },
    );

    expect(contract.readiness.disposition).toBe("ready");
    expect(contract.authorityEvidenceIds)
      .toContain("game-design:flag:rule:reset");
  });
});
