import { describe, expect, it } from "vitest";
import {
  classifyGameplayIssue,
  GAMEPLAY_ISSUE_FAILURE_DOMAINS,
} from "../src/index.js";

describe("gameplay issue taxonomy", () => {
  it("classifies multi-arena capacity as arena domain at ready/start", () => {
    expect(
      classifyGameplayIssue({
        gameplayStage: "READY_START",
        scenarioLabel: "arena-capacity-plus-one",
        componentIds: [
          "runtime:arena",
          "runtime:arena-capacity",
        ],
        knowledgeDomain:
          "multiplayer-interleaving",
      }),
    ).toEqual({
      failureDomain: "arena-multi-arena",
      gameplayFlow: "READY_START",
    });
  });

  it("classifies wave progression above entity implementation detail", () => {
    expect(
      classifyGameplayIssue({
        gameplayStage: "PROGRESSION",
        scenarioLabel: "wave-progression",
        componentIds: ["runtime:entities"],
        knowledgeDomain: "entity-behavior",
      }),
    ).toEqual({
      failureDomain:
        "progression-wave-objective",
      gameplayFlow: "PROGRESSION",
    });
  });

  it("classifies inventory economy interactions consistently", () => {
    expect(
      classifyGameplayIssue({
        gameplayStage: "ACTIVE_GAMEPLAY",
        scenarioLabel: "shop-purchase",
        componentIds: [
          "runtime:economy",
          "runtime:inventory",
        ],
        knowledgeDomain: "economy-reward",
      }),
    ).toEqual({
      failureDomain: "inventory-economy",
      gameplayFlow: "ACTIVE_GAMEPLAY",
    });
  });

  it("classifies player-facing UI information separately", () => {
    expect(
      classifyGameplayIssue({
        gameplayStage: "READY_START",
        scenarioLabel: "queue-feedback",
        componentIds: ["runtime:ui-form"],
      }),
    ).toEqual({
      failureDomain:
        "ui-feedback-information",
      gameplayFlow: "READY_START",
    });
  });

  it("keeps the domain vocabulary bounded", () => {
    expect(new Set(
      GAMEPLAY_ISSUE_FAILURE_DOMAINS,
    ).size).toBe(
      GAMEPLAY_ISSUE_FAILURE_DOMAINS.length,
    );
  });
});
