import { describe, expect, it } from "vitest";
import {
  proveLifecycleRelease,
} from "../src/lifecycle-proof.js";

describe("lifecycle release proof", () => {
  it("proves terminal paths only when every continuation reaches release", () => {
    const proof = proveLifecycleRelease(
      [
        { id: "start", from: "idle", to: "playing" },
        {
          id: "win",
          from: "playing",
          to: "finishing",
          trigger: "victory",
        },
        { id: "finish", from: "finishing", to: "available" },
      ],
      {
        activeStates: ["playing"],
        releaseStates: ["available"],
        terminalTriggers: ["victory", "disconnect"],
      },
    );

    expect(proof.status).toBe("proven");
  });

  it("finds terminal paths that can cycle without releasing the arena", () => {
    const proof = proveLifecycleRelease(
      [
        {
          id: "disconnect",
          from: "playing",
          to: "cleanup",
          trigger: "disconnect",
        },
        { id: "retry", from: "cleanup", to: "cleanup" },
      ],
      {
        activeStates: ["playing"],
        releaseStates: ["available"],
        terminalTriggers: ["disconnect"],
      },
    );

    expect(proof.status).toBe("violated");
    expect(proof.violations[0]?.reason).toBe(
      "terminal-target-can-cycle-without-release",
    );
  });
});
