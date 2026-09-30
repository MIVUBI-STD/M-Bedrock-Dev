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
          proofAuthority:
            "test-only",
          execute,
        },
      );

    expect(result.status)
      .toBe("completed");
    expect(result.proofAuthority)
      .toBe("test-only");
    expect(result.reasons.join(" "))
      .toMatch(/do not establish live runtime proof/);
    expect(execute)
      .toHaveBeenCalledTimes(2);
    expect(result.evidenceIds)
      .toEqual([
        "e:p1",
        "e:p2",
      ]);
  });

  it("does not promote execution without evidence to runtime proof", async () => {
    const result =
      await executeMultiClientScenario(
        {
          schemaVersion: 1,
          id: "multi:no-evidence",
          clients: [{ id: "p1" }],
          waves: [{
            id: "step",
            mode: "serial",
            actions: [{
              id: "step:p1",
              clientId: "p1",
              actionId: "noop",
            }],
          }],
        },
        {
          adapterId: "no-evidence",
          maxClients: 1,
          proofAuthority:
            "test-only",
          execute: async () => ({
            evidenceIds: [],
          }),
        },
      );

    expect(result.status)
      .toBe("incomplete-evidence");
  });

  it("keeps server-simulated evidence below real client proof", async () => {
    const result =
      await executeMultiClientScenario(
        {
          schemaVersion: 1,
          id: "multi:simulated",
          clients: [{ id: "p1" }],
          waves: [{
            id: "disconnect",
            mode: "serial",
            actions: [{
              id: "disconnect:p1",
              clientId: "p1",
              actionId: "disconnect",
            }],
          }],
        },
        {
          adapterId:
            "server-harness",
          maxClients: 1,
          proofAuthority:
            "server-simulated",
          execute: async () => ({
            evidenceIds: [
              "e:server-state",
            ],
          }),
        },
      );

    expect(result.status)
      .toBe("completed");
    expect(
      result.proofAuthority,
    ).toBe("server-simulated");
    expect(
      result.reasons.join(" "),
    ).toMatch(
      /does not establish real client\/network lifecycle proof/,
    );
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
          proofAuthority:
            "test-only",
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
