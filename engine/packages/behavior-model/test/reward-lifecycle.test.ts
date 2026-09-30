import { describe, expect, it } from "vitest";
import {
  composeBehavioralWorldModel,
  createRewardLifecycleBehavior,
  validateBehavioralWorldModel,
} from "../src/index.js";

describe("reward lifecycle behavior", () => {
  it("requires verified delivery before durable reward commit", () => {
    const model =
      composeBehavioralWorldModel(
        "reward",
        [
          createRewardLifecycleBehavior({
            rewardKey:
              "arena-1:round-4:reward-1",
            commitDeadlineTicks: 40,
          }),
        ],
      );

    expect(
      validateBehavioralWorldModel(model),
    ).toEqual([]);
    expect(
      model.properties.some(
        (property) =>
          property.id.endsWith(
            ":commit-requires-verification",
          ),
      ),
    ).toBe(true);
    expect(
      model.transitions.some(
        (transition) =>
          transition.id.endsWith(
            ":invalidate-generation",
          ),
      ),
    ).toBe(true);
  });
});
