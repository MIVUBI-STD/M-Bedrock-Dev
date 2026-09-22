import { describe, expect, it } from "vitest";
import {
  createSessionBoundedDomain,
  exploreBoundedStateSpace,
  sessionStateIdentity,
} from "../src/index.js";
import { createSessionModel } from "../../reliability/src/index.js";

describe("bounded exhaustive state explorer", () => {
  it("explores unique session states deterministically within explicit bounds", () => {
    const domain = createSessionBoundedDomain({
      playerIds: ["p1", "p2"],
      arenaIds: ["arena1", "arena2"],
      progressAmounts: [1],
    });

    const first = exploreBoundedStateSpace(domain, {
      maxDepth: 4,
      maxStates: 500,
    });
    const second = exploreBoundedStateSpace(domain, {
      maxDepth: 4,
      maxStates: 500,
    });

    expect(first.statesExplored).toBeGreaterThan(1);
    expect(first.uniqueTransitions).toBeGreaterThan(0);
    expect(first.visitedStateIds).toEqual(second.visitedStateIds);
    expect(first.failures).toEqual(second.failures);
  });

  it("canonical state identity ignores insertion order", () => {
    const a = createSessionModel(["arena1", "arena2"]);
    const b = createSessionModel(["arena2", "arena1"]);

    expect(sessionStateIdentity(a)).toBe(sessionStateIdentity(b));
  });

  it("reports truncation when state budget is exhausted", () => {
    const domain = createSessionBoundedDomain({
      playerIds: ["p1", "p2"],
      arenaIds: ["arena1", "arena2"],
    });

    const result = exploreBoundedStateSpace(domain, {
      maxDepth: 8,
      maxStates: 5,
    });

    expect(result.statesExplored).toBe(5);
    expect(result.truncated).toBe(true);
  });
});
