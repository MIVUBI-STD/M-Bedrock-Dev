import { describe, expect, it } from "vitest";
import {
  validateFailurePatternCatalog,
  validateRegressionCatalog,
  validateUpdateDelta,
} from "../../src/catalog/catalogs.js";

describe("reliability catalog validation", () => {
  it("rejects duplicate update-delta ids", () => {
    expect(validateUpdateDelta({
      toVersion: "1.2.3",
      entries: [
        {
          id: "same",
          kind: "changed",
          domain: "commands",
          capabilityTags: [],
          affectedIdentifiers: [],
          summary: "a",
          source: "s",
          confidence: "documented",
        },
        {
          id: "same",
          kind: "changed",
          domain: "scripts",
          capabilityTags: [],
          affectedIdentifiers: [],
          summary: "b",
          source: "s",
          confidence: "documented",
        },
      ],
    })).toEqual(expect.arrayContaining([
      "Duplicate update delta entry id: same",
    ]));
  });

  it("requires expected and observed regression behavior", () => {
    expect(validateRegressionCatalog([{
      id: "reg",
      title: "Regression",
      domain: "commands",
      discoveredBy: "manual",
      invariantIds: [],
      triggerTags: [],
      capabilityTags: [],
      reproduction: [],
      expected: "",
      observed: "",
    }])).toHaveLength(2);
  });

  it("requires every durable regression to contribute to cross-map learning", () => {
    const regression = {
      id: "reg-learning",
      title: "Learning regression",
      domain: "state" as const,
      discoveredBy: "manual" as const,
      invariantIds: [],
      triggerTags: [],
      capabilityTags: [],
      reproduction: [],
      expected: "Expected state.",
      observed: "Observed state.",
    };

    expect(validateFailurePatternCatalog([], [regression])).toEqual([
      "Regression reg-learning has no failure-pattern learning coverage.",
    ]);

    expect(validateFailurePatternCatalog([{
      id: "state-boundary-leak",
      title: "State boundary leak",
      domain: "state",
      summary: "State survives a boundary where it should be cleared.",
      invariantIds: ["state.boundary-cleanup"],
      triggerTags: ["state"],
      capabilityTags: ["state"],
      supportingRegressionIds: ["reg-learning"],
      detectionHints: ["Compare mutation and cleanup ownership."],
      retestFocus: ["Repeat the transition with mutated state."],
    }], [regression])).toEqual([]);
  });

  it("accepts the production historical regression vocabulary", () => {
    expect(validateRegressionCatalog([{
      id: "reg-production",
      canonicalIssueId: "reg-production",
      title: "Production regression",
      issueType: "BUG",
      domain: "world",
      discoveredBy: "approved-ai",
      provenance: {
        source: "Canonical Bug Report V2",
        reportPath: "workspace/reports/Map-BugReport.json",
        map: "Map",
        mapVersion: "1.0.0",
        bugId: "BUG-001",
        artifactFingerprint: "sha256:example",
      },
      triggerTags: ["gameplay"],
      capabilityTags: ["world-mutation"],
      reproduction: ["Reproduce the issue."],
      expected: "World state remains isolated.",
      observed: "World state leaks.",
    }])).toEqual([]);
  });
});
