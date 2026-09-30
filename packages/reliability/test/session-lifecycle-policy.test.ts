import { describe, expect, it } from "vitest";
import {
  assessSessionLifecyclePolicy,
  defaultRestartOnReconnectPolicy,
} from "../src/session-lifecycle-policy.js";

describe("session lifecycle policy", () => {
  it("proves restart-on-reconnect behavior only when every expected phase is observed", () => {
    const observations = defaultRestartOnReconnectPolicy().map((rule) => ({
      phase: rule.phase,
      event: rule.event,
      resultingPhase: rule.expectedPhase,
      preservedArenaAssignment: rule.preserveArenaAssignment,
      preservedProgress: rule.preserveProgress,
    }));

    expect(
      assessSessionLifecyclePolicy(
        defaultRestartOnReconnectPolicy(),
        observations,
      ).status,
    ).toBe("proven");
  });

  it("returns unknown for missing lifecycle evidence rather than assuming behavior", () => {
    const result = assessSessionLifecyclePolicy(
      defaultRestartOnReconnectPolicy(),
      [],
    );

    expect(result.status).toBe("unknown");
    expect(result.missingRules.length).toBeGreaterThan(0);
  });
});
