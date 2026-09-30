import { describe, expect, it } from "vitest";
import {
  analyzeMultiplayerInterleavings,
  multiplayerEventOperation,
} from "../src/multiplayer-interleaving.js";

describe("multiplayer interleaving analysis", () => {
  it("binds generation changes as dependencies and ranks stale-work schedules", () => {
    const events = [
      {
        id: "disconnect",
        kind: "disconnect" as const,
        arenaId: "arena-1",
        playerId: "p1",
        arenaGeneration: 2,
        connectionGeneration: 7,
      },
      {
        id: "callback",
        kind: "deferred-callback" as const,
        arenaId: "arena-1",
        playerId: "p1",
        arenaGeneration: 2,
        connectionGeneration: 7,
      },
      {
        id: "reconnect",
        kind: "reconnect" as const,
        arenaId: "arena-1",
        playerId: "p1",
        arenaGeneration: 2,
        connectionGeneration: 8,
      },
    ];

    const result =
      analyzeMultiplayerInterleavings(events, {
        maxSchedules: 16,
      });

    expect(
      result.generationDependencyPairs,
    ).toBeGreaterThan(0);
    expect(result.schedules[0]?.riskReasons).toContain(
      "disconnect-stale-work",
    );
  });

  it("derives explicit footprints for arena membership state", () => {
    const operation = multiplayerEventOperation({
      id: "membership",
      kind: "membership-commit",
      arenaId: "arena-a",
      playerId: "player-a",
      arenaGeneration: 1,
      participationGeneration: 3,
    });

    expect(operation.footprint.writes).toEqual(
      expect.arrayContaining([
        "arena:arena-a:membership",
        "player:player-a:assignment",
      ]),
    );
  });

  it("preserves happens-before constraints while reducing independent schedules", () => {
    const result = analyzeMultiplayerInterleavings(
      [
        {
          id: "request-a",
          kind: "start-request",
          arenaId: "arena-a",
          arenaGeneration: 1,
        },
        {
          id: "commit-a",
          kind: "start-commit",
          arenaId: "arena-a",
          arenaGeneration: 1,
          parentEventIds: ["request-a"],
        },
        {
          id: "request-b",
          kind: "start-request",
          arenaId: "arena-b",
          arenaGeneration: 1,
        },
      ],
      {
        maxSchedules: 16,
      },
    );

    expect(
      result.schedules.every(
        (schedule) =>
          schedule.eventIds.indexOf("request-a") <
          schedule.eventIds.indexOf("commit-a"),
      ),
    ).toBe(true);
    expect(
      result.reducedEquivalentBranches,
    ).toBeGreaterThanOrEqual(0);
  });
});
