import { describe, expect, it } from "vitest";
import {
  createCrossVersionDifferentialPlan,
  executeCrossVersionDifferentialPlan,
} from "../src/index.js";

describe("cross-version differential executor", () => {
  it("fails closed when required hosts are missing", async () => {
    const plan =
      createCrossVersionDifferentialPlan(
        "diff",
        "exp",
        "fixture",
        [
          {
            profileFingerprint: "a",
            edition: "bedrock",
            version: "1",
            host: "client",
          },
          {
            profileFingerprint: "b",
            edition: "bedrock",
            version: "2",
            host: "client",
          },
        ],
        1,
      );

    const result =
      await executeCrossVersionDifferentialPlan(
        plan,
        [],
      );

    expect(result.receipt.status).toBe(
      "incomplete",
    );
    expect(result.receipt.missingProfiles).toEqual([
      "a",
      "b",
    ]);
    expect(result.executionErrors).toHaveLength(2);
  });
});
