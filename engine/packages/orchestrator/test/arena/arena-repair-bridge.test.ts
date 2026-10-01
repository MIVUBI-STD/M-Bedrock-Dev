import { describe, expect, it } from "vitest";
import { bridgeArenaRepairLocalization } from "../../src/arena/arena-repair-bridge.js";

describe("arena repair bridge", () => {
  it("allows deterministic repair only when exact localization matches an existing planned candidate", () => {
    const bridge =
      bridgeArenaRepairLocalization(
        {
          localized: 1,
          unresolved: 0,
          items: [{
            kind: "voxel",
            arenaId: "arena-2",
            unresolved: false,
            reasons: [],
            candidates: [{
              sourceId: "source",
              source: {
                artifactId: "fixture",
                relativePath:
                  "functions/setup.mcfunction",
                range: {
                  lineStart: 4,
                  lineEnd: 4,
                },
              },
              sourceKind: "command",
              authoredKind: "setblock",
              strength: "exact-overlap",
              reason: "exact",
            }],
          }],
        },
        [{
          kind: "linear-topology-outlier",
          diagnosticCode:
            "TOPOLOGY_TRANSLATION_OUTLIER",
          sourcePath:
            "functions/setup.mcfunction",
          line: 4,
          status: "planned",
          transaction: {
            id: "patch-1",
            sourceFingerprint:
              "fingerprint",
            operations: [],
            validation: [],
          },
        }],
      );

    expect(bridge).toMatchObject({
      deterministicRepairs: 1,
      proposalOnly: 0,
      unresolved: 0,
    });
    expect(
      bridge.items[0]?.status,
    ).toBe(
      "deterministic-repair-available",
    );
  });

  it("keeps region-only localization proposal-only", () => {
    const bridge =
      bridgeArenaRepairLocalization(
        {
          localized: 1,
          unresolved: 0,
          items: [{
            kind: "voxel",
            arenaId: "arena-2",
            unresolved: false,
            reasons: [],
            candidates: [{
              sourceId: "source",
              source: {
                artifactId: "fixture",
                relativePath:
                  "functions/setup.mcfunction",
              },
              sourceKind: "command",
              authoredKind: "fill",
              strength: "arena-overlap",
              reason: "regional",
            }],
          }],
        },
        [],
      );

    expect(
      bridge.items[0]?.status,
    ).toBe("proposal-only");
  });
});
