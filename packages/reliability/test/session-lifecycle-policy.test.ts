import { describe, expect, it } from "vitest";
import {
  assessSessionLifecyclePolicy,
  type SessionLifecyclePolicyRule,
} from "../src/session-lifecycle-policy.js";

const restartOnReconnectPolicy:
  readonly SessionLifecyclePolicyRule[] = [
    {
      phase: "assigned",
      event: "disconnect",
      expectedPhase: "assigned",
      preserveArenaAssignment: true,
      preserveProgress: false,
    },
    {
      phase: "starting",
      event: "disconnect",
      expectedPhase: "assigned",
      preserveArenaAssignment: true,
      preserveProgress: false,
    },
    {
      phase: "playing",
      event: "disconnect",
      expectedPhase: "assigned",
      preserveArenaAssignment: true,
      preserveProgress: false,
    },
    {
      phase: "assigned",
      event: "reconnect",
      expectedPhase: "assigned",
      preserveArenaAssignment: true,
      preserveProgress: false,
    },
    {
      phase: "starting",
      event: "reconnect",
      expectedPhase: "assigned",
      preserveArenaAssignment: true,
      preserveProgress: false,
    },
    {
      phase: "playing",
      event: "reconnect",
      expectedPhase: "assigned",
      preserveArenaAssignment: true,
      preserveProgress: false,
    },
  ];

describe("session lifecycle policy", () => {
  it("proves caller-supplied restart-on-reconnect rules only when every expected phase is observed", () => {
    const observations =
      restartOnReconnectPolicy.map((rule) => ({
        phase: rule.phase,
        event: rule.event,
        resultingPhase:
          rule.expectedPhase,
        preservedArenaAssignment:
          rule.preserveArenaAssignment,
        preservedProgress:
          rule.preserveProgress,
      }));

    expect(
      assessSessionLifecyclePolicy(
        restartOnReconnectPolicy,
        observations,
      ).status,
    ).toBe("proven");
  });

  it("returns unknown for missing lifecycle evidence rather than assuming behavior", () => {
    const result =
      assessSessionLifecyclePolicy(
        restartOnReconnectPolicy,
        [],
      );

    expect(result.status).toBe("unknown");
    expect(
      result.missingRules.length,
    ).toBeGreaterThan(0);
  });
});
