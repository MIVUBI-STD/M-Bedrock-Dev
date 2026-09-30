import { describe, expect, it } from "vitest";
import {
  validateRuntimeExperimentCatalog,
  type RuntimeExperimentCatalog,
} from "../src/index.js";

const experiment = {
  schemaVersion: 1 as const,
  id: "exp:catalog",
  title: "Catalog fixture",
  domain: "scheduler" as const,
  requiredContext: "LIVE_MINECRAFT" as const,
  mutationRisk: "read-only" as const,
  targetProfileFingerprint: "profile-a",
  fixtureFingerprint: "fixture-a",
  protocol: [{
    id: "observe",
    phase: "observe" as const,
    actionId: "runtime.capture",
  }],
  factors: [{
    id: "mode",
    description: "fixture mode",
  }],
  arms: [{
    id: "control",
    role: "control" as const,
    factorValues: { mode: "control" },
  }, {
    id: "treatment",
    role: "treatment" as const,
    factorValues: { mode: "treatment" },
  }],
  outcomePredicateIds: ["outcome"],
  minimumRunsPerArm: 2,
};

describe("runtime experiment catalog", () => {
  it("rejects duplicate experiment identities", () => {
    const catalog: RuntimeExperimentCatalog = {
      schemaVersion: 1,
      experiments: [experiment, experiment],
    };
    expect(validateRuntimeExperimentCatalog(catalog).join(" "))
      .toMatch(/Duplicate runtime experiment id/);
  });

  it("keeps invalid controlled experiments out of the catalog", () => {
    const catalog: RuntimeExperimentCatalog = {
      schemaVersion: 1,
      experiments: [{
        ...experiment,
        arms: experiment.arms.map((arm) => ({
          ...arm,
          factorValues: { mode: "same" },
        })),
      }],
    };
    expect(validateRuntimeExperimentCatalog(catalog).join(" "))
      .toMatch(/must differ on at least one declared factor/);
  });
});
