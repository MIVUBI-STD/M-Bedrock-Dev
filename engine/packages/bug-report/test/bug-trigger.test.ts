import {
  describe,
  expect,
  it,
} from "vitest";
import {
  compileBugTrigger,
} from "../src/index.js";

describe("Bug Trigger compiler", () => {
  it("compiles bounded gameplay facts into tester steps", () => {
    const result = compileBugTrigger({
      gameplayBasis: "authored-gameplay",
      startingCondition:
        "Join the arena with 2 players",
      actions: [
        "Finish the match normally",
        "Return to the lobby",
        "Start the same arena again",
      ],
      observableFailure:
        "the new match does not start",
      evidenceIds: [
        "intent:arena-restart",
        "runtime:restart-failed",
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.steps).toEqual([
      "Join the arena with 2 players.",
      "Finish the match normally.",
      "Return to the lobby.",
      "Start the same arena again.",
      "Confirm: the new match does not start.",
    ]);
    expect(result.evidenceIds).toEqual([
      "intent:arena-restart",
      "runtime:restart-failed",
    ]);
    expect(result.gameplayBasis).toBe(
      "authored-gameplay",
    );
  });

  it("does not compile without a visible failure", () => {
    const result = compileBugTrigger({
      gameplayBasis: "authored-gameplay",
      startingCondition: "Join the arena",
      actions: ["Finish the match"],
      observableFailure: "",
      evidenceIds: ["runtime:failure"],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(
      result.issues.map((issue) => issue.code),
    ).toContain("missing-observable-failure");
  });

  it("requires evidence for AI-authored trigger facts", () => {
    const result = compileBugTrigger({
      gameplayBasis: "authored-gameplay",
      startingCondition: "Join the arena",
      observableFailure:
        "the match does not start",
      evidenceIds: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(
      result.issues.map((issue) => issue.code),
    ).toContain("missing-evidence");
  });

  it("rejects trigger paths that exceed five steps", () => {
    const result = compileBugTrigger({
      gameplayBasis: "authored-gameplay",
      startingCondition: "Join the arena",
      actions: [
        "Action one",
        "Action two",
        "Action three",
        "Action four",
      ],
      observableFailure:
        "the bug is visible",
      evidenceIds: ["runtime:failure"],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(
      result.issues.map((issue) => issue.code),
    ).toContain("too-many-steps");
  });
});
