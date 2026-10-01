import { describe, expect, it } from "vitest";
import { deterministicTextRobustnessCases, runMetamorphicCampaign, runParserRobustnessCampaign } from "../../src/index.js";

describe("metamorphic and parser robustness", () => {
  it("reports preserved and violated relations", async () => {
    const result = await runMetamorphicCampaign(
      "abc",
      [
        { id: "same-length", relation: "length-preserved", input: "xyz" },
        { id: "changed-length", relation: "length-preserved", input: "longer" },
      ],
      (value) => ({ length: value.length }),
      (baseline, candidate) => baseline.length === candidate.length,
    );
    expect(result.preserved).toBe(1);
    expect(result.violated).toBe(1);
  });

  it("generates deterministic robustness cases", async () => {
    const cases = deterministicTextRobustnessCases("export function demo(){ return 1; }");
    const result = await runParserRobustnessCampaign(cases, (text) => text.includes("\\u0000") ? "rejected" : "accepted");
    expect(cases).toHaveLength(5);
    expect(result.harnessErrors).toBe(0);
  });
});
