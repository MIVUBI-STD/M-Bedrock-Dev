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
    expect(byKind.get("terminal-collision")).toBe(
      "TERMINAL",
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
