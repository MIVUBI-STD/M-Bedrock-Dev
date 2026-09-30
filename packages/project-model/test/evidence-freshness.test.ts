import { describe, expect, it } from "vitest";
import {
  evaluateEvidenceFreshness,
} from "../src/evidence-freshness.js";

describe("evidence freshness", () => {
  it("marks evidence stale when a bound node fingerprint changes", () => {
    const result = evaluateEvidenceFreshness({
      evidence: [{
        evidenceId: "evidence_a",
        basisNodeIds: ["script:arena"],
        basisFingerprint: "old",
      }],
      currentNodeFingerprints: {
        "script:arena": "new",
      },
    });

    expect(result.staleEvidenceIds).toEqual([
      "evidence_a",
    ]);
  });
});
