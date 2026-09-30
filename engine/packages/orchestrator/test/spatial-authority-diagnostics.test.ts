import { describe, expect, it } from "vitest";
import {
  spatialAuthorityDiagnostics,
} from "../src/spatial-authority-diagnostics.js";

describe("spatial authority diagnostics", () => {
  it("emits medium severity for conflicting or invalid policy coverage", () => {
    const findings =
      spatialAuthorityDiagnostics({
        policyId: "policy",
        policyValid: false,
        policyErrors: [],
        knownRegions: ["plot"],
        referencedUnknownRegions: ["ghost"],
        resolved: 0,
        uncovered: 0,
        conflicts: 1,
        unknownRegions: 1,
        assessments: [],
      });

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      code: "SPATIAL_AUTHORITY_POLICY_GAP",
      severity: "medium",
    });
  });

  it("uses minor severity for uncovered authored requirements only", () => {
    const findings =
      spatialAuthorityDiagnostics({
        policyId: "policy",
        policyValid: true,
        policyErrors: [],
        knownRegions: ["plot"],
        referencedUnknownRegions: [],
        resolved: 1,
        uncovered: 1,
        conflicts: 0,
        unknownRegions: 0,
        assessments: [],
      });

    expect(findings[0]).toMatchObject({
      code: "SPATIAL_AUTHORITY_POLICY_GAP",
      severity: "minor",
    });
  });
});
