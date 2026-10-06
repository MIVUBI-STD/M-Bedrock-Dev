import { describe, expect, it } from "vitest";
import {
  buildGameplayAuditScenarioPreset,
} from "../src/gameplay-audit-scenario-preset.js";

describe("gameplay audit scenario preset flow stages", () => {
  it("binds mandatory scenarios to player-journey stages", () => {
    const preset = buildGameplayAuditScenarioPreset({
      maxPartySize: 4,
      arenaCount: 3,
      concurrentArenaLimit: 2,
      hasMultiArena: true,
      hasPersistence: true,
      hasDeferredWork: true,
      hasRepeatedRunSurface: true,
    });

    const byKind = new Map(
      preset.scenarios.map((scenario) => [
        scenario.kind,
        scenario.flowStage,
      ]),
    );

    expect(byKind.get("full-journey")).toBe(
      "FULL_JOURNEY",
    );
    expect(byKind.get("solo")).toBe("ENTRY_JOIN");
    expect(byKind.get("party-capacity-plus-one")).toBe(
      "READY_START",
    );
    expect(byKind.get("multi-arena-parallel")).toBe(
      "READY_START",
    );
    expect(byKind.get("arena-replica-integrity")).toBe(
      "SETUP",
    );
    const parallelScenario = preset.scenarios.find(
      (scenario) =>
        scenario.kind === "multi-arena-parallel",
    );
    expect(parallelScenario?.concurrentArenas).toBe(3);
    const replicaScenario = preset.scenarios.find(
      (scenario) =>
        scenario.kind === "arena-replica-integrity",
    );
    expect(replicaScenario?.concurrentArenas).toBe(3);
    expect(replicaScenario?.questions.join(" ")).toMatch(
      /world\/topology|replica/i,
    );
    expect(byKind.get("arena-capacity-plus-one")).toBe(
      "READY_START",
    );
    const capacityScenario = preset.scenarios.find(
      (scenario) =>
        scenario.kind === "arena-capacity-plus-one",
    );
    expect(capacityScenario?.concurrentArenas).toBe(3);
    expect(capacityScenario?.reason).toMatch(
      /gameplay\/design capacity degradation/i,
    );
    expect(byKind.get("terminal-collision")).toBe(
      "TERMINAL",
    );
    const progressionPreset =
      buildGameplayAuditScenarioPreset({
        hasProgressionActorSurface: true,
      });
    const progressionScenario =
      progressionPreset.scenarios.find(
        (scenario) =>
          scenario.kind ===
            "progression-wave-integrity",
      );
    expect(progressionScenario?.flowStage).toBe(
      "PROGRESSION",
    );
    expect(
      progressionScenario?.questions.join(" "),
    ).toMatch(
      /death\/removal|stop simulating|completion counter/i,
    );
    const terminalScenario = preset.scenarios.find(
      (scenario) =>
        scenario.kind === "terminal-collision",
    );
    expect(terminalScenario?.questions.join(" ")).toMatch(
      /ordinary player|terminal scopes/i,
    );
    const reconnectScenario = preset.scenarios.find(
      (scenario) =>
        scenario.kind === "disconnect-reconnect",
    );
    expect(reconnectScenario?.questions.join(" ")).toMatch(
      /locked required roster|builder\/role selection/i,
    );
    expect(byKind.get("disconnect-reconnect")).toBe(
      "RECOVERY",
    );
    expect(byKind.get("reload-recovery")).toBe(
      "RECOVERY",
    );
    expect(byKind.get("repeated-run")).toBe(
      "CLEANUP_REPLAY",
    );
  });

  it("derives minimum audit coverage and bounded scenarios from resolved map classification", () => {
    const preset =
      buildGameplayAuditScenarioPreset({
        classification: {
          mapType: "SURVIVAL",
          playerMode: "COOPERATIVE",
          mechanicTags: [
            "WAVE_DEFENSE",
            "MULTI_ARENA",
            "ROUND_TIMER",
            "WORLD_RESET",
          ],
          classificationStatus:
            "RESOLVED",
          evidenceRefs: [
            "design:survival-loop",
          ],
        },
      });

    const coverage = preset.scenarios.find(
      (item) =>
        item.kind ===
          "map-type-coverage",
    );

    expect(
      coverage?.requiredKnowledgeDomains,
    ).toEqual(
      expect.arrayContaining([
        "state-flow",
        "combat-lifecycle",
        "entity-behavior",
        "temporal-ownership",
        "multiplayer-interleaving",
        "chunk-simulation",
        "arena-lifecycle",
        "world-structure",
      ]),
    );

    const kinds = new Set(
      preset.scenarios.map(
        (item) => item.kind,
      ),
    );

    expect(kinds.has(
      "multi-arena-parallel",
    )).toBe(true);
    expect(kinds.has(
      "progression-wave-integrity",
    )).toBe(true);
    expect(kinds.has(
      "simulation-distance",
    )).toBe(true);
    expect(kinds.has(
      "deferred-ownership",
    )).toBe(true);
    expect(kinds.has(
      "repeated-run",
    )).toBe(true);
  });

  it("does not route unresolved map classification into mandatory audit coverage", () => {
    const preset =
      buildGameplayAuditScenarioPreset({
        classification: {
          mapType: null,
          playerMode: null,
          mechanicTags: [
            "MULTI_ARENA",
          ],
          classificationStatus:
            "UNRESOLVED",
          evidenceRefs: [],
        },
      });

    expect(
      preset.scenarios.some(
        (item) =>
          item.kind ===
            "map-type-coverage",
      ),
    ).toBe(false);
    expect(
      preset.scenarios.some(
        (item) =>
          item.kind ===
            "multi-arena-parallel",
      ),
    ).toBe(false);
  });
});
