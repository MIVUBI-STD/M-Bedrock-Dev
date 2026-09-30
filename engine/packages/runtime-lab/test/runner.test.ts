import { describe, expect, it } from "vitest";
import {
  executeRuntimeExperimentCampaign,
  runtimeExperimentDefinitionRevision,
  type RuntimeExperimentDefinition,
} from "../src/index.js";

const definition: RuntimeExperimentDefinition = {
  schemaVersion: 1,
  id: "exp:runner",
  title: "Runner fixture",
  domain: "chunks",
  requiredContext: "LIVE_MINECRAFT",
  mutationRisk: "read-only",
  targetProfileFingerprint: "profile-a",
  fixtureFingerprint: "fixture-a",
  protocol: [{
    id: "capture",
    phase: "observe",
    actionId: "chunk.capture",
  }],
  factors: [{ id: "probe", description: "probe" }],
  arms: [{
    id: "control",
    role: "control",
    factorValues: { probe: false },
  }, {
    id: "treatment",
    role: "treatment",
    factorValues: { probe: true },
  }],
  outcomePredicateIds: ["chunk-ready"],
  minimumRunsPerArm: 1,
};

describe("runtime experiment host boundary", () => {
  it("refuses a host below the required runtime context", async () => {
    await expect(executeRuntimeExperimentCampaign(
      definition,
      {
        context: "LOCAL_MINECRAFT",
        environmentFingerprint: "env-a",
        async executeTrial() {
          throw new Error("must not execute");
        },
      },
    )).rejects.toThrow(/requires LIVE_MINECRAFT/);
  });

  it("validates host trial identity rather than trusting the adapter", async () => {
    const result = await executeRuntimeExperimentCampaign(
      definition,
      {
        context: "LIVE_MINECRAFT",
        environmentFingerprint: "env-a",
        async executeTrial(_definition, identity) {
          return {
            schemaVersion: 1,
            id: "bad",
            identity: {
              ...identity,
              definitionRevision:
                runtimeExperimentDefinitionRevision({
                  ...definition,
                  title: "stale",
                }),
            },
            status: "completed",
            evidence: [{
              predicate: "chunk-ready",
              state: "present",
              confidence: "observed",
            }],
          };
        },
      },
    );

    expect(result.invalidTrialErrors.join(" "))
      .toMatch(/definition revision is stale/);
  });
});
