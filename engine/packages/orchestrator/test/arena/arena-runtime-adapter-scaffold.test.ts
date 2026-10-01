import { describe, expect, it } from "vitest";
import { buildArenaRuntimeAdapterScaffold } from "../../src/arena/arena-runtime-adapter-scaffold.js";

describe("arena runtime adapter scaffold", () => {
  it("fails closed for live client lifecycle requirements", () => {
    const scaffold =
      buildArenaRuntimeAdapterScaffold({
        arenaAnalysis: {
          autoDetected: true,
          spatialLayout: {
            basis: "topology",
            canonical: {
              arenaId: "arena-1",
              anchor: { x: 0, y: 0, z: 0 },
            },
            replicas: [],
            offsets: [],
            confidence: "high",
          },
          stressPlan: {
            status: "planned",
            reasons: [],
            matrix: {
              schemaVersion: 1,
              arenaIds: ["arena-1"],
              playersPerArena: 5,
              totalNominalPlayers: 5,
              scenarios: [{
                id: "disconnect",
                kind: "disconnect-during-active",
                arenaIds: ["arena-1"],
                playerIds: ["p"],
                invariants: [],
                purpose: "disconnect",
              }],
              byKind: {} as any,
            },
          },
        },
      } as any);

    expect(
      scaffold.javascript,
    ).toMatch(
      /external multi-client adapter/,
    );
    expect(
      scaffold.javascript,
    ).toMatch(
      /proofAuthority: "server-simulated"/,
    );
  });
});
