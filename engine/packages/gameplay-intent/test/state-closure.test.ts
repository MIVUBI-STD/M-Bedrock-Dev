import { describe, expect, it } from "vitest";
import {
  assessGameplayStateClosure,
  type GameplayIntentModel,
} from "../src/index.js";

function model(
  edges: GameplayIntentModel["edges"],
): GameplayIntentModel {
  return {
    schemaVersion: 1,
    id: "state-closure",
    evidence: [],
    nodes: [
      {
        id: "phase:lobby",
        kind: "phase",
        label: "Lobby",
        status: "authored",
        evidenceIds: [],
      },
      {
        id: "phase:combat",
        kind: "phase",
        label: "Combat",
        status: "authored",
        evidenceIds: [],
      },
    ],
    edges,
    invariants: [],
    unknowns: [],
  };
}

describe("gameplay state closure", () => {
  it("does not call the model complete when a state has no exit", () => {
    const result = assessGameplayStateClosure(
      model([{
        id: "edge:lobby-combat",
        from: "phase:lobby",
        to: "phase:combat",
        kind: "transitions-to",
        status: "authored",
        evidenceIds: [],
      }]),
    );

    expect(result.complete).toBe(false);
    expect(
      result.records.find(
        (item) =>
          item.subjectId === "phase:combat",
      )?.hasExit,
    ).toBe(false);
  });

  it("closes states only when entry and exit paths are modeled", () => {
    const result = assessGameplayStateClosure(
      model([
        {
          id: "edge:lobby-combat",
          from: "phase:lobby",
          to: "phase:combat",
          kind: "transitions-to",
          status: "authored",
          evidenceIds: [],
        },
        {
          id: "edge:combat-lobby",
          from: "phase:combat",
          to: "phase:lobby",
          kind: "recovers-to",
          status: "authored",
          evidenceIds: [],
        },
      ]),
    );

    expect(result.complete).toBe(true);
  });
});
