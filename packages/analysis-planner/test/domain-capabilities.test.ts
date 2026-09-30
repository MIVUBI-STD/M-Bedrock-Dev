import { describe, expect, it } from "vitest";
import {
  BUILTIN_ANALYSIS_CAPABILITIES,
  createAnalysisCapabilityRegistry,
  planMinimumSufficientAnalysis,
} from "../src/index.js";

describe("domain analysis capabilities", () => {
  it("forms one valid builtin capability registry", () => {
    const registry =
      createAnalysisCapabilityRegistry(
        BUILTIN_ANALYSIS_CAPABILITIES,
      );

    expect(registry.capabilities.length)
      .toBe(
        BUILTIN_ANALYSIS_CAPABILITIES.length,
      );
  });

  it("selects inventory semantic analysis directly in remote GitHub context", () => {
    const plan =
      planMinimumSufficientAnalysis({
        goal: "semantic-consistency",
        relevantTags: [
          "inventory",
          "loadout",
        ],
        context: "REMOTE_GITHUB",
        capabilities:
          BUILTIN_ANALYSIS_CAPABILITIES,
      });

    expect(plan.disposition)
      .toBe("execute");
    expect(plan.steps[0]).toMatchObject({
      capabilityId:
        "inventory-lifecycle-integrity",
      evidenceLevel: "semantic",
      cost: "moderate",
    });
  });

  it("selects static navigation readiness before expensive runtime navigation", () => {
    const plan =
      planMinimumSufficientAnalysis({
        goal: "runtime-behavior",
        relevantTags: [
          "entity",
          "navigation",
        ],
        context: "LIVE_MINECRAFT",
        capabilities:
          BUILTIN_ANALYSIS_CAPABILITIES,
      });

    expect(plan.disposition)
      .toBe("execute");
    expect(plan.steps[0]?.capabilityId)
      .toBe(
        "entity-ai-navigation-readiness",
      );
  });

  it("advances to runtime navigation after semantic prerequisite is complete", () => {
    const plan =
      planMinimumSufficientAnalysis({
        goal: "runtime-behavior",
        relevantTags: [
          "entity",
          "navigation",
        ],
        context: "LIVE_MINECRAFT",
        completedCapabilityIds: [
          "entity-ai-navigation-readiness",
        ],
        availableEvidence: [{
          level: "semantic",
          evidenceIds: [
            "entity-ai-stack:demo:zombie",
          ],
          quality: "usable",
          traits: ["semantic-model"],
        }],
        capabilities:
          BUILTIN_ANALYSIS_CAPABILITIES,
      });

    expect(plan.disposition)
      .toBe("execute");
    expect(plan.steps[0]?.capabilityId)
      .toBe(
        "entity-ai-navigation-runtime",
      );
  });

  it("does not invent runtime economy capability where no controlled experiment exists", () => {
    const plan =
      planMinimumSufficientAnalysis({
        goal: "runtime-behavior",
        relevantTags: [
          "economy",
          "reward",
        ],
        context: "LIVE_MINECRAFT",
        completedCapabilityIds: [
          "economy-reward-integrity",
        ],
        availableEvidence: [{
          level: "semantic",
          evidenceIds: [
            "economy:semantic",
          ],
          quality: "usable",
          traits: ["semantic-model"],
        }],
        capabilities:
          BUILTIN_ANALYSIS_CAPABILITIES,
      });

    expect(plan.disposition)
      .toBe("capability-gap");
    expect(plan.steps).toEqual([]);
  });

  it("selects persistence semantic analysis before runtime recovery", () => {
    const plan =
      planMinimumSufficientAnalysis({
        goal: "runtime-behavior",
        relevantTags: [
          "persistence",
          "recovery",
        ],
        context: "LIVE_MINECRAFT",
        capabilities:
          BUILTIN_ANALYSIS_CAPABILITIES,
      });

    expect(plan.disposition).toBe("execute");
    expect(plan.steps[0]).toMatchObject({
      capabilityId:
        "persistence-lifecycle-integrity",
      evidenceLevel: "semantic",
      cost: "moderate",
    });
  });

  it("advances persistence analysis to controlled runtime recovery after semantic evidence", () => {
    const plan =
      planMinimumSufficientAnalysis({
        goal: "runtime-behavior",
        relevantTags: [
          "persistence",
          "recovery",
        ],
        context: "LIVE_MINECRAFT",
        completedCapabilityIds: [
          "persistence-lifecycle-integrity",
        ],
        availableEvidence: [{
          level: "semantic",
          evidenceIds: [
            "persistence:semantic",
          ],
          quality: "usable",
          traits: ["semantic-model"],
        }],
        capabilities:
          BUILTIN_ANALYSIS_CAPABILITIES,
      });

    expect(plan.disposition).toBe("execute");
    expect(plan.steps[0]).toMatchObject({
      capabilityId:
        "persistence-recovery-runtime",
      evidenceLevel: "runtime",
      cost: "expensive",
    });
  });

});
