import { describe, expect, it } from "vitest";
import { compileArenaGlobalStateRuntime } from "../../src/arena/arena-global-state-runtime-compiler.js";

describe("arena global state runtime compiler", () => {
  it("compiles a paired static lease into a two-arena race experiment", () => {
    const result =
      compileArenaGlobalStateRuntime({
        analysis: {
          mutations: [],
          assessments: [{
            mutationId: "m1",
            resource: "gamerule:pvp",
            status:
              "paired-lease-evidence",
            acquireEvidence: 1,
            releaseEvidence: 1,
            restoreEvidence: 1,
            auditEvidence: 1,
            audited: true,
            reasons: [],
          }],
          arenaScopedMutations: 1,
          pairedLeaseEvidence: 1,
          partialLeaseEvidence: 0,
          unleasedArenaMutations: 0,
          unscopedMutations: 0,
          unauditedArenaMutations: 0,
        },
        arenaIds: [
          "arena-1",
          "arena-2",
        ],
        arenaGenerations: {
          "arena-1": 1,
          "arena-2": 2,
        },
        targetProfileFingerprint:
          "target",
        fixtureFingerprint:
          "fixture",
        objectiveId: "qa",
        participant: "result",
        baselineValues: {
          "gamerule:pvp": "true",
        },
        firstValues: {
          "gamerule:pvp": "false",
        },
        secondValues: {
          "gamerule:pvp": "true",
        },
      });

    expect(result.runtimeReady)
      .toHaveLength(1);
    expect(result.experiments[0]?.id)
      .toBe(
        "worldstate-lease-race:gamerule:pvp",
      );
  });

  it("keeps missing static lease evidence as a static defect", () => {
    const result =
      compileArenaGlobalStateRuntime({
        analysis: {
          mutations: [],
          assessments: [{
            mutationId: "m1",
            resource: "weather",
            status: "unleased",
            acquireEvidence: 0,
            releaseEvidence: 0,
            restoreEvidence: 0,
            auditEvidence: 0,
            audited: false,
            reasons: [],
          }],
          arenaScopedMutations: 1,
          pairedLeaseEvidence: 0,
          partialLeaseEvidence: 0,
          unleasedArenaMutations: 1,
          unscopedMutations: 0,
          unauditedArenaMutations: 1,
        },
        arenaIds: [
          "arena-1",
          "arena-2",
        ],
        arenaGenerations: {},
        targetProfileFingerprint:
          "target",
        fixtureFingerprint:
          "fixture",
        objectiveId: "qa",
        participant: "result",
      });

    expect(result.staticDefects)
      .toHaveLength(1);
    expect(result.runtimeReady)
      .toEqual([]);
  });
});
