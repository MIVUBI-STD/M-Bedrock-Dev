import { describe, expect, it } from "vitest";
import {
  intentAuthorityStrength,
  resolveGameDesignIntentRules,
  type GameDesignSpec,
} from "../src/index.js";

const design: GameDesignSpec = {
  schemaVersion: 1,
  id: "arena",
  status: "approved",
  source: {
    kind: "authored-spec",
    reference: "design/game-design.json",
  },
  mechanics: [],
  intentRules: [{
    id: "friendly-fire",
    statement: "Same-team damage is forbidden during active team play.",
    subjectIds: ["combat:team-damage"],
    outcome: "forbidden",
    appliesWhen: {
      modes: ["offense"],
      phases: ["active"],
      actorTypes: ["player"],
    },
    exceptions: [{
      id: "developer-mode",
      statement: "Developer diagnostics may bypass combat restrictions.",
      stateTags: ["developer"],
    }],
  }],
  invariants: [],
};

describe("Game Design intent resolution", () => {
  it("resolves scoped approved intent with authoritative strength", () => {
    const rules = resolveGameDesignIntentRules(
      design,
      {
        modeId: "offense",
        phase: "active",
        actorType: "player",
      },
      ["combat:team-damage"],
    );
    expect(rules).toHaveLength(1);
    expect(rules[0]?.authority).toBe("authoritative");
    expect(intentAuthorityStrength(design)).toBe("authoritative");
  });

  it("surfaces explicit exceptions instead of treating them as defects", () => {
    const [rule] = resolveGameDesignIntentRules(
      design,
      {
        modeId: "offense",
        phase: "active",
        actorType: "player",
        stateTags: ["developer"],
      },
      ["combat:team-damage"],
    );
    expect(rule?.exceptionId).toBe("developer-mode");
  });
});
