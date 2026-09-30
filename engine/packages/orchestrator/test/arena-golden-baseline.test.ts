import { describe, expect, it } from "vitest";
import { buildArenaGoldenBaselineCandidate } from "../src/arena-golden-baseline.js";

describe("arena golden baseline candidate", () => {
  it("warns instead of accepting identity drift as a baseline", () => {
    const result =
      buildArenaGoldenBaselineCandidate(
        {
          arenaAnalysis: {
            autoDetected: true,
            proofExecution: {
              mode: "full",
              decisions: [],
              executedLayers: [],
              skippedLayers: [],
            },
            lifecycle: {
              terminalCandidates: 0,
              proven: 0,
              partial: 0,
              unresolved: 0,
              assessments: [],
            },
          },
          diagnostics: [{
            id: "drift",
            code: "PACK_IDENTITY_DRIFT",
            severity: "medium",
            message: "drift",
          }],
          releaseIdentity: {
            status: "consistent",
            observations: [],
            conflicts: [],
          },
        } as any,
        {
          id: "map-a",
          label: "Map A",
          artifactFile: "maps/a.mcworld",
        },
      );

    expect(
      result.case.assertions
        .requirePackIdentityDrift,
    ).toBe(false);
    expect(
      result.warnings.join(" "),
    ).toMatch(/PACK_IDENTITY_DRIFT/);
    expect(result.approvalRequired)
      .toBe(true);
  });
});
