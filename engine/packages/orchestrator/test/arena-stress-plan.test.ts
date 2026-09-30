import { describe, expect, it } from "vitest";
import { deriveArenaStressPlan } from "../src/arena-stress-plan.js";

describe("arena stress plan", () => {
  it("plans a 30-player nominal matrix for six five-player arenas", () => {
    const result = deriveArenaStressPlan(
      {
        basis: "topology",
        canonical: {
          arenaId: "arena-1",
          anchor: { x: 0, y: 0, z: 0 },
        },
        replicas: Array.from(
          { length: 5 },
          (_, index) => ({
            arenaId: `arena-${index + 2}`,
            anchor: {
              x: (index + 1) * 100,
              y: 0,
              z: 0,
            },
          }),
        ),
        offsets: Array.from(
          { length: 5 },
          (_, index) => ({
            x: (index + 1) * 100,
            y: 0,
            z: 0,
          }),
        ),
        confidence: "high",
      },
      {
        resources: [],
        evidence: {
          requestedConcurrentArenas: 6,
          discoveredArenaCount: 6,
          arenaCountConflict: false,
          commandTickingAreaAdds: 0,
          completeCommandTickingAreaFamilies: 0,
          unmatchedCommandTickingAreaAdds: 0,
          commandTickingAreaResourceResolved: false,
          scriptTickingAreaManagerReferenced: false,
          scriptCapacitySignals: [],
          scriptTickingAreaCapacityResolved: false,
          perArenaPlayerCapacity: 5,
          declaredMaxConcurrentPlayers: 30,
          conflictingPlayerCapacityValues: [],
          reasons: [],
        },
        report: {
          requestedConcurrentArenas: 6,
          safeConcurrentArenas: null,
          ok: true,
          limitingResourceIds: [],
          resources: [],
        },
      },
    );

    expect(result.status).toBe("planned");
    expect(result.matrix?.totalNominalPlayers)
      .toBe(30);
  });

  it("does not assume five players when capacity is unresolved", () => {
    const result = deriveArenaStressPlan(
      {
        basis: "script-config",
        canonical: {
          arenaId: "arena-1",
          anchor: { x: 0, y: 0, z: 0 },
        },
        replicas: [],
        offsets: [],
        confidence: "medium",
      },
      undefined,
    );

    expect(result.status).toBe("unavailable");
    expect(result.matrix).toBeUndefined();
  });
});
