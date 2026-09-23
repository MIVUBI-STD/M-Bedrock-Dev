import { describe, expect, it } from "vitest";
import type { VersionAwareEvidenceLink } from "../src/version-aware-comparison.js";

describe("version-aware comparison contract", () => {
  it("keeps update/native/regression evidence descriptive", () => {
    const link: VersionAwareEvidenceLink = {
      updateEntryId: "1.26.40-structure-saved-tick-fix",
      domain: "structures",
      overlappingCapabilities: ["structure-load"],
      historicalRegressionIds: ["reg_capture_run_gate_blocked"],
      nativeEvidence: {
        countDeltas: ["pendingTickRecords:-2"],
        changedChunkSignals: 1,
      },
    };

    expect(link.updateEntryId).toContain("1.26.40");
    expect(link.nativeEvidence.changedChunkSignals).toBe(1);
  });
});
