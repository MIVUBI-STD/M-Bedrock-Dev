import { describe, expect, it } from "vitest";
import {
  authorizeRepair,
} from "../src/authorization.js";

describe("repair authorization", () => {
  it("rejects stale evidence even for a confirmed defect", () => {
    expect(
      authorizeRepair({
        confirmedDefect: true,
        diagnosisEvidenceIds: ["evidence_1"],
        invariantIds: ["arena.release"],
        sourceFingerprintMatches: true,
        evidenceFreshness: "stale",
      }).authorized,
    ).toBe(false);
  });

  it("authorizes only fully grounded fresh repair plans", () => {
    expect(
      authorizeRepair({
        confirmedDefect: true,
        diagnosisEvidenceIds: ["evidence_1"],
        invariantIds: ["arena.release"],
        sourceFingerprintMatches: true,
        evidenceFreshness: "fresh",
      }).authorized,
    ).toBe(true);
  });
});
