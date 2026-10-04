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
});
