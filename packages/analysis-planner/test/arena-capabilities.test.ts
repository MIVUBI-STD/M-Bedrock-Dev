import { describe, expect, it } from "vitest";
import {
  ARENA_ANALYSIS_CAPABILITIES,
  createAnalysisCapabilityRegistry,
  planMinimumSufficientAnalysis,
} from "../src/index.js";

describe("arena analysis capabilities", () => {
  it("form a valid capability registry without duplicate ownership", () => {
    const registry = createAnalysisCapabilityRegistry(
      ARENA_ANALYSIS_CAPABILITIES,
    );
    expect(registry.capabilities).toHaveLength(6);
  });

  it("selects the cheap capacity proof before expensive spatial analysis when capacity is relevant", () => {
    const plan = planMinimumSufficientAnalysis({
      goal: "semantic-consistency",
      relevantTags: ["arena", "capacity"],
      context: "REMOTE_GITHUB",
      capabilities: ARENA_ANALYSIS_CAPABILITIES,
    });

    expect(plan.disposition).toBe("execute");
    expect(plan.steps[0]?.capabilityId).toBe("arena-concurrency-capacity");
  });
});
