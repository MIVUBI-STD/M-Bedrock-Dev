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
        sourceFingerprint: "abc",
        sourceFingerprintMatches: true,
        evidenceFreshness: "stale",
      }).authorized,
    ).toBe(false);
  });

  it("returns a receipt only for fully grounded fresh repair plans", () => {
    const result = authorizeRepair({
      confirmedDefect: true,
      diagnosisEvidenceIds: ["evidence_1"],
      invariantIds: ["arena.release"],
      sourceFingerprint: "abc",
      sourceFingerprintMatches: true,
      evidenceFreshness: "fresh",
    });

    expect(result.authorized).toBe(true);
    expect(result.receipt).toEqual(
      expect.objectContaining({
        sourceFingerprint: "abc",
        evidenceFreshness: "fresh",
      }),
    );
  });
});
