import { describe, expect, it } from "vitest";
import { buildDiagnosticCalibrationReport } from "../src/index.js";

describe("diagnostic calibration", () => {
  it("computes empirical precision/recall without inventing probability", () => {
    const report = buildDiagnosticCalibrationReport([
      { detectorId: "demo", sourceStyle: "bundled-minified", proofTier: "STATIC", outcome: "true-positive" },
      { detectorId: "demo", sourceStyle: "bundled-minified", proofTier: "STATIC", outcome: "true-positive" },
      { detectorId: "demo", sourceStyle: "bundled-minified", proofTier: "STATIC", outcome: "false-positive" },
      { detectorId: "demo", sourceStyle: "bundled-minified", proofTier: "STATIC", outcome: "false-negative" },
    ], 5);

    const segment = report.segments[0]!;
    expect(segment.precision).toBeCloseTo(2 / 3);
    expect(segment.recall).toBeCloseTo(2 / 3);
    expect(segment.state).toBe("insufficient-sample");
  });
});
