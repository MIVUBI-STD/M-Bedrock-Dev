import { describe, expect, it } from "vitest";
import { buildGameplayAuditScenarioPreset } from "../src/gameplay-audit-scenario-preset.js";

describe("cross-check audit scenario routing", () => {
  it("routes privileged, world-rule, representation and containment surfaces", () => {
    const preset = buildGameplayAuditScenarioPreset({
      hasPrivilegedCapabilitySurface: true,
      hasWorldRuleSurface: true,
      hasCancelledWorldMutationSurface: true,
      hasSpatialContainmentSurface: true,
    });

    const kinds = new Set(preset.scenarios.map((scenario) => scenario.kind));

    expect(kinds.has("player-capability-integrity")).toBe(true);
    expect(kinds.has("world-rule-authority")).toBe(true);
    expect(kinds.has("client-server-reconciliation")).toBe(true);
    expect(kinds.has("spatial-containment")).toBe(true);
  });

  it("does not add those scenario families when their surfaces are absent", () => {
    const preset = buildGameplayAuditScenarioPreset({});

    const kinds = new Set(preset.scenarios.map((scenario) => scenario.kind));

    expect(kinds.has("player-capability-integrity")).toBe(false);
    expect(kinds.has("world-rule-authority")).toBe(false);
    expect(kinds.has("client-server-reconciliation")).toBe(false);
    expect(kinds.has("spatial-containment")).toBe(false);
  });
  it("routes containment when the caller marks a flight-capable arena surface", () => {
    const preset = buildGameplayAuditScenarioPreset({
      hasSpatialContainmentSurface: true,
      hasMultiArena: true,
      arenaCount: 4,
    });

    expect(
      preset.scenarios.some(
        (scenario) => scenario.kind === "spatial-containment",
      ),
    ).toBe(true);
  });
});
