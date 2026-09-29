import {
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  createArenaCapacityGuardExperiment,
  createMultiArenaStartOwnershipExperiment,
  executeMultiClientScenario,
  requiredLogicalClientsForExperiment,
} from "../src/index.js";

describe("multi-client orchestration", () => {
  it("executes parallel waves concurrently through an explicit adapter", async () => {
    const execute = vi.fn(
      async (
        client: { id: string },
      ) => ({
        evidenceIds: [
          "e:" + client.id,
        ],
        runtimeTick: 10,
      }),
    );

    const result =
      await executeMultiClientScenario(
        {
          schemaVersion: 1,
          id: "multi:1",
          clients: [
            { id: "p1" },
            { id: "p2" },
          ],
          waves: [{
            id: "join",
            mode: "parallel",
            actions: [{
              id: "join:p1",
              clientId: "p1",
              actionId: "join",
            }, {
              id: "join:p2",
              clientId: "p2",
              actionId: "join",
            }],
          }],
        },
        {
          adapterId:
            "fake-runtime",
          maxClients: 2,
          execute,
        },
      );

    expect(result.status)
      .toBe("completed");
    expect(execute)
      .toHaveBeenCalledTimes(2);
    expect(result.evidenceIds)
      .toEqual([
        "e:p1",
        "e:p2",
      ]);
  });

  it("blocks when real adapter capacity is below scenario demand", async () => {
    const execute = vi.fn();

    const result =
      await executeMultiClientScenario(
        {
          schemaVersion: 1,
          id: "multi:capacity",
          clients: [
            { id: "p1" },
            { id: "p2" },
          ],
          waves: [{
            id: "join",
            mode: "parallel",
            actions: [{
              id: "a1",
              clientId: "p1",
              actionId: "join",
            }, {
              id: "a2",
              clientId: "p2",
              actionId: "join",
            }],
          }],
        },
        {
          adapterId: "small",
          maxClients: 1,
          execute,
        },
      );

    expect(result.status)
      .toBe("blocked");
    expect(execute)
      .not.toHaveBeenCalled();
  });

  it("derives minimum logical client count from multiplayer experiment parameters", () => {
    const capacity =
      createArenaCapacityGuardExperiment({
        id: "capacity",
        title: "capacity",
        targetProfileFingerprint:
          "runtime",
        fixtureFingerprint:
          "fixture",
        objectiveId: "o",
        participant: "#p",
        arena: {
          arenaId: "a",
          arenaGeneration: 1,
        },
        maxPlayers: 5,
        attemptedPlayers: 6,
      });

    expect(
      requiredLogicalClientsForExperiment(
        capacity,
      ),
    ).toBe(6);

    const multiArena =
      createMultiArenaStartOwnershipExperiment({
        id: "starts",
        title: "starts",
        targetProfileFingerprint:
          "runtime",
        fixtureFingerprint:
          "fixture",
        objectiveId: "o",
        participant: "#p",
        arenaA: {
          arenaId: "a",
          arenaGeneration: 1,
        },
        arenaB: {
          arenaId: "b",
          arenaGeneration: 1,
        },
        playerCountPerArena: 5,
      });

    expect(
      requiredLogicalClientsForExperiment(
        multiArena,
      ),
    ).toBe(10);
  });
});
