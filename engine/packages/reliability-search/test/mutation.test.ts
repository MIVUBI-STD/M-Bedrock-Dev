import { describe, expect, it } from "vitest";
import {
  SESSION_STATE_MUTATIONS,
  mutateAbsoluteCoordinates,
  mutateCommandSource,
  mutateSelectorScope,
  mutateStructureReference,
  mutationScoreReport,
  runSessionMutationCampaign,
} from "../src/index.js";

describe("Bedrock-specific source mutations", () => {
  it("broadens scoped selectors", () => {
    const mutations = mutateSelectorScope(
      "scoreboard players set @a[tag=arena1,scores={stage=1..}] active 1",
    );
    expect(mutations.some((item) =>
      item.descriptor.operator === "selector-broaden" &&
      item.mutated.includes("@a active 1"),
    )).toBe(true);
  });

  it("shifts absolute fill coordinates by plus/minus one", () => {
    const mutations = mutateAbsoluteCoordinates(
      "fill 10 20 30 12 22 32 stone",
    );
    expect(mutations).toHaveLength(12);
    expect(mutations.map((item) => item.mutated)).toContain(
      "fill 11 20 30 12 22 32 stone",
    );
  });

  it("redirects structure load references", () => {
    const mutations = mutateStructureReference(
      "structure load demo:arena 0 0 0",
    );
    expect(mutations).toHaveLength(1);
    expect(mutations[0]?.mutated).toContain("demo:__mutation_missing__arena");
  });

  it("combines source mutation operators deterministically", () => {
    const mutations = mutateCommandSource(
      "fill 10 20 30 12 22 32 stone",
    );
    expect(mutations.map((item) => item.descriptor.id))
      .toEqual([...mutations.map((item) => item.descriptor.id)]);
  });
});

describe("session mutation campaign", () => {
  it("kills reset/progress and phase mutations with targeted session cases", () => {
    const results = runSessionMutationCampaign(
      [
        {
          arenaIds: ["arena1"],
          actions: [
            { kind: "join", playerId: "p1" },
            { kind: "assign", playerId: "p1", arenaId: "arena1" },
            { kind: "start", playerId: "p1" },
            { kind: "begin-playing", playerId: "p1" },
            { kind: "progress", playerId: "p1", amount: 3 },
            { kind: "disconnect", playerId: "p1" },
          ],
        },
        {
          arenaIds: ["arena1", "arena2"],
          actions: [
            { kind: "join", playerId: "p1" },
            { kind: "join", playerId: "p2" },
            { kind: "assign", playerId: "p1", arenaId: "arena1" },
            { kind: "assign", playerId: "p2", arenaId: "arena2" },
            { kind: "start", playerId: "p1" },
            { kind: "start", playerId: "p2" },
          ],
        },
      ],
      SESSION_STATE_MUTATIONS,
    );

    const report = mutationScoreReport(results);
    expect(report.total).toBe(SESSION_STATE_MUTATIONS.length);
    expect(report.killed).toBeGreaterThan(0);
    expect(report.byDomain["state-reset"]?.total).toBeGreaterThan(0);
  });
});
