import { describe, expect, it } from "vitest";
import {
  validateRegressionCatalog,
  validateUpdateDelta,
} from "../src/catalogs.js";

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
});
