import { describe, expect, it } from "vitest";
import {
  runtimeProbeTemplateForFinding,
} from "../src/finding-probe-generator.js";

describe("finding probe generator", () => {
  it("generates a minimal arena-release probe from a finding", () => {
    const probe = runtimeProbeTemplateForFinding({
      findingId: "finding:arena-release",
      domain: "arena-release",
      subject: "arena lease",
      arenaId: "arena-3",
    });

    expect(probe.steps.length).toBe(3);
    expect(probe.expectedEvidence).toContain(
      "re-allocation result",
    );
  });
});
