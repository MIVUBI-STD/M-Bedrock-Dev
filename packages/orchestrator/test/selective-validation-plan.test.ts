import {
  describe,
  expect,
  it,
} from "vitest";
import type {
  ValidationScenario,
} from "../../validation/src/index.js";
import {
  planSelectiveValidation,
  selectiveValidationPlanText,
} from "../src/selective-validation-plan.js";
import type {
  SemanticAffectedPlan,
} from "../src/semantic-affected-plan.js";

const scenarios:
  readonly ValidationScenario[] = [
  {
    schemaVersion: 1,
    id: "scenario:arena",
    revision: "1",
    title: "Arena lifecycle",
    intentInvariantIds: ["arena"],
    steps: [{ kind: "rebuild-graph" }],
    requiredProofLevel:
      "STATIC VERIFIED",
  },
  {
    schemaVersion: 1,
    id: "scenario:shop",
    revision: "1",
    title: "Shop behavior",
    intentInvariantIds: ["shop"],
    steps: [{ kind: "rebuild-graph" }],
    requiredProofLevel:
      "STATIC VERIFIED",
  },
  {
    schemaVersion: 1,
    id: "scenario:unbound",
    revision: "1",
    title: "Legacy conservative",
    intentInvariantIds: ["legacy"],
    steps: [{ kind: "rebuild-graph" }],
    requiredProofLevel:
      "STATIC VERIFIED",
  },
];

function affected():
  SemanticAffectedPlan {
  return {
    status: "planned",
    changedNodeIds: ["node:arena"],
    affectedNodeIds: [
      "node:arena",
      "node:caller",
    ],
    skippedNodeIds: [
      "node:shop",
      "node:other",
    ],
    affectedPaths: [
      "scripts/arena.ts",
    ],
    knownPaths: [
      "scripts/arena.ts",
      "scripts/shop.ts",
    ],
    totalNodeCount: 4,
    changedNodeCount: 1,
    affectedNodeCount: 2,
    skippedNodeCount: 2,
    skipRatio: 0.5,
    reasons: [],
  };
}

describe("selective validation planning", () => {
  it("runs affected scenarios, skips proven-unaffected scenarios, and keeps unbound scenarios conservative", () => {
    const plan =
      planSelectiveValidation(
        scenarios,
        [
          {
            scenarioId:
              "scenario:arena",
            semanticNodeIds: [
              "node:arena",
            ],
          },
          {
            scenarioId:
              "scenario:shop",
            semanticNodeIds: [
              "node:shop",
            ],
          },
        ],
        affected(),
      );

    expect(plan.status).toBe(
      "planned",
    );
    expect(
      plan.selected.map(
        (item) => item.scenarioId,
      ),
    ).toEqual([
      "scenario:arena",
      "scenario:unbound",
    ]);
    expect(
      plan.skipped.map(
        (item) => item.scenarioId,
      ),
    ).toEqual([
      "scenario:shop",
    ]);
    expect(plan.skipRatio)
      .toBeCloseTo(1 / 3);
  });

  it("supports source-path bindings and always-run safety scenarios", () => {
    const plan =
      planSelectiveValidation(
        scenarios.slice(0, 2),
        [
          {
            scenarioId:
              "scenario:arena",
            sourcePaths: [
              "scripts/arena.ts",
            ],
          },
          {
            scenarioId:
              "scenario:shop",
            alwaysRun: true,
            reason:
              "release smoke coverage",
          },
        ],
        affected(),
      );

    expect(plan.selected)
      .toHaveLength(2);
    expect(
      plan.selected[0]?.reason,
    ).toBe("affected-path");
    expect(
      plan.selected[1]?.reason,
    ).toBe("always-run");
    expect(plan.skipped)
      .toHaveLength(0);
  });

  it("blocks selective skipping when bindings contain stale source paths", () => {
    const plan =
      planSelectiveValidation(
        scenarios.slice(0, 1),
        [{
          scenarioId:
            "scenario:arena",
          sourcePaths: [
            "scripts/missing.ts",
          ],
        }],
        affected(),
      );

    expect(plan.status)
      .toBe("blocked");
    expect(plan.errors.join(" "))
      .toMatch(/source path absent/);
  });

  it("blocks selective skipping when bindings contain stale semantic nodes", () => {
    const plan =
      planSelectiveValidation(
        scenarios.slice(0, 1),
        [{
          scenarioId:
            "scenario:arena",
          semanticNodeIds: [
            "node:missing",
          ],
        }],
        affected(),
      );

    expect(plan.status).toBe(
      "blocked",
    );
    expect(plan.skipped)
      .toHaveLength(0);
    expect(plan.errors.join(" "))
      .toMatch(/absent/);
  });

  it("explains selected and skipped work", () => {
    const plan =
      planSelectiveValidation(
        scenarios,
        [
          {
            scenarioId:
              "scenario:arena",
            semanticNodeIds: [
              "node:arena",
            ],
          },
          {
            scenarioId:
              "scenario:shop",
            semanticNodeIds: [
              "node:shop",
            ],
          },
        ],
        affected(),
      );

    const text =
      selectiveValidationPlanText(
        plan,
      );

    expect(text)
      .toContain("Selected: 2");
    expect(text)
      .toContain("Skipped: 1");
    expect(text)
      .toContain("scenario:shop");
    expect(text)
      .toContain(
        "outside the affected closure",
      );
  });
});
