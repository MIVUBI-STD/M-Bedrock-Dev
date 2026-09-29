import {
  describe,
  expect,
  it,
} from "vitest";
import {
  assertEngineeringTaskPreconditions,
  routeEngineeringTask,
} from "../src/index.js";

describe("engineering task routing", () => {
  it("starts bug diagnosis from intent instead of mutation", () => {
    const route =
      routeEngineeringTask({
        kind: "diagnose",
        context:
          "LOCAL_ARTIFACT",
      });

    expect(route.initialGoal)
      .toBe(
        "intent-classification",
      );
    expect(route.mutationAllowed)
      .toBe(false);
  });

  it("requires runtime behavior for runtime-sensitive bug verification", () => {
    const route =
      routeEngineeringTask({
        kind: "verify-bug",
        context:
          "LIVE_MINECRAFT",
        runtimeSensitive: true,
      });

    expect(route.initialGoal)
      .toBe(
        "runtime-behavior",
      );
    expect(
      route.requiredPreconditions,
    ).toContain(
      "candidate-bug",
    );
  });

  it("keeps lower-context repair work below the runtime proof ceiling", () => {
    const route =
      routeEngineeringTask({
        kind: "repair",
        context:
          "LOCAL_ARTIFACT",
      });

    expect(route.initialGoal)
      .toBe(
        "semantic-consistency",
      );
    expect(route.runtimeMayBeRequired)
      .toBe(true);
  });

  it("does not allow repair without diagnosis and preservation preconditions", () => {
    const route =
      routeEngineeringTask({
        kind: "repair",
        context:
          "LOCAL_ARTIFACT",
      });

    expect(() =>
      assertEngineeringTaskPreconditions(
        route,
        {
          hasProvenDiagnosis:
            true,
        },
      )
    ).toThrow(
      /repair-invariants/,
    );
  });

  it("keeps performance conclusions below runtime proof when runtime is unavailable", () => {
    const route =
      routeEngineeringTask({
        kind:
          "performance-audit",
        context:
          "LOCAL_ARTIFACT",
      });

    expect(route.initialGoal)
      .toBe(
        "semantic-consistency",
      );
    expect(
      route.runtimeMayBeRequired,
    ).toBe(true);
  });
});
