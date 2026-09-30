import { describe, expect, it } from "vitest";
import {
  BUG_REPORT_SCHEMA,
  type BugReportV1,
  validateBugReportSemantics,
} from "../src/index.js";

function baseReport(): BugReportV1 {
  return {
    schema: BUG_REPORT_SCHEMA,
    map: {
      name: "Blitz Build",
      version: "1.0.3",
      minecraftVersion: "1.26.32",
      drive: "https://drive.google.com/file/d/example/view",
    },
    bugFinders: [],
  };
}

describe("bug report semantic validation", () => {
  it("accepts a gameplay-only tester observation", () => {
    const report: BugReportV1 = {
      ...baseReport(),
      bugFinders: [
        {
          category: "player-state",
          bugs: [
            {
              title: "Inventory remains after match end",
              severity: "major",
              foundBy: "tester",
              verification: "observed",
              problem: "Match state leaks into the lobby.",
              reproduction: [
                "Join a match",
                "Acquire a match item",
                "Finish the match",
                "Return to the lobby",
              ],
              expected: "Match inventory is cleared before lobby control returns.",
              observed: {
                gameplay: "The match sword remains in inventory in the lobby.",
              },
            },
          ],
        },
      ],
    };

    expect(validateBugReportSemantics(report)).toEqual({
      valid: true,
      issues: [],
    });
  });

  it("accepts an AI candidate with a concrete verification plan", () => {
    const report: BugReportV1 = {
      ...baseReport(),
      bugFinders: [
        {
          category: "multiplayer-session",
          bugs: [
            {
              title: "Reconnect can resolve stale session ownership",
              severity: "blocker",
              foundBy: "ai",
              verification: "candidate",
              problem: "A reconnecting player may attach to stale session state.",
              expected: "Reconnect resolves ownership only from the current session.",
              observed: {
                code: "Reconnect lookup can run while previous ownership remains readable.",
              },
              verifyBug: [
                "Run one arena with five players",
                "Disconnect one player during cleanup",
                "Reconnect during next-session initialization",
                "Check whether previous ownership survives",
              ],
              diagnosis: "Reconnect initialization can overlap previous-session cleanup.",
              relevantCode: [
                {
                  file: "scripts/arena/session.ts",
                  reason: "Owns disconnect cleanup and reconnect resolution.",
                },
              ],
            },
          ],
        },
      ],
    };

    expect(validateBugReportSemantics(report)).toEqual({
      valid: true,
      issues: [],
    });
  });

  it("accepts a verified AI+tester report with gameplay and code evidence", () => {
    const report: BugReportV1 = {
      ...baseReport(),
      bugFinders: [
        {
          category: "world-interaction",
          bugs: [
            {
              title: "Water affects blocks outside the active plot",
              severity: "major",
              foundBy: "ai+tester",
              verification: "verified",
              problem: "Players can modify world state outside their assigned build area.",
              reproduction: [
                "Start the building phase",
                "Use a water bucket on iron bars outside the active plot",
              ],
              reproducibility: {
                attempts: 3,
                reproduced: 3,
              },
              expected: "All world interaction outside the active plot is rejected.",
              observed: {
                gameplay: "Iron bars outside the plot become waterlogged.",
                code: "Bucket interaction reaches mutation without the normal containment gate.",
              },
              diagnosis: "Bucket use follows a separate mutation path.",
              rootCause: "The bucket path omits active-plot containment validation.",
              repairDirection: "Route bucket interaction through the existing containment policy.",
              mustPreserve: [
                "Water remains usable inside the active plot.",
              ],
              fixValidation: [
                "Verify outside-plot bucket interaction is rejected",
                "Verify water still works inside the plot",
              ],
            },
          ],
        },
      ],
    };

    expect(validateBugReportSemantics(report)).toEqual({
      valid: true,
      issues: [],
    });
  });

  it("rejects tester findings that contain code analysis", () => {
    const report: BugReportV1 = {
      ...baseReport(),
      bugFinders: [
        {
          category: "game-flow",
          bugs: [
            {
              title: "Round cannot restart",
              severity: "blocker",
              foundBy: "tester",
              verification: "observed",
              problem: "The next mandatory round cannot begin.",
              expected: "The arena can start a new round after cleanup.",
              observed: {
                gameplay: "Start no longer works after the first defeat.",
                code: "Cleanup leaves the arena state locked.",
              },
              diagnosis: "Cleanup is incomplete.",
            },
          ],
        },
      ],
    };

    const result = validateBugReportSemantics(report);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "tester-contains-code-analysis",
    );
  });

  it("rejects AI-only findings that claim gameplay observation", () => {
    const report: BugReportV1 = {
      ...baseReport(),
      bugFinders: [
        {
          category: "multiplayer-session",
          bugs: [
            {
              title: "Stale reconnect state",
              severity: "major",
              foundBy: "ai",
              verification: "candidate",
              problem: "Reconnect may reuse stale state.",
              expected: "Reconnect uses current-session state only.",
              observed: {
                gameplay: "The player retained stale state.",
                code: "Old ownership remains readable during reconnect.",
              },
              verifyBug: ["Attempt reconnect during cleanup"],
            },
          ],
        },
      ],
    };

    const result = validateBugReportSemantics(report);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "ai-contains-gameplay-observation",
    );
  });

  it("rejects verified tester findings without repeated reproduction", () => {
    const report: BugReportV1 = {
      ...baseReport(),
      bugFinders: [
        {
          category: "combat",
          bugs: [
            {
              title: "Friendly fire remains enabled",
              severity: "major",
              foundBy: "tester",
              verification: "verified",
              problem: "Players can damage teammates despite team rules.",
              reproduction: [
                "Start a team match",
                "Attack a teammate",
              ],
              reproducibility: {
                attempts: 2,
                reproduced: 1,
              },
              expected: "Teammate damage is rejected.",
              observed: {
                gameplay: "The teammate loses health.",
              },
            },
          ],
        },
      ],
    };

    const result = validateBugReportSemantics(report);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "insufficient-verified-reproduction",
    );
  });

  it("rejects impossible reproducibility counts", () => {
    const report: BugReportV1 = {
      ...baseReport(),
      bugFinders: [
        {
          category: "player-state",
          bugs: [
            {
              title: "Inventory reset failure",
              severity: "major",
              foundBy: "tester",
              verification: "observed",
              problem: "Match inventory leaks into the lobby.",
              expected: "Match inventory is cleared.",
              observed: {
                gameplay: "A match item remains in inventory.",
              },
              reproducibility: {
                attempts: 2,
                reproduced: 3,
              },
            },
          ],
        },
      ],
    };

    const result = validateBugReportSemantics(report);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "invalid-reproducibility-count",
    );
  });

  it("rejects duplicate finder categories", () => {
    const bug = {
      title: "Message repeats",
      severity: "minor" as const,
      foundBy: "tester" as const,
      verification: "observed" as const,
      problem: "Feedback is duplicated.",
      expected: "One message is shown.",
      observed: { gameplay: "The same message appears twice." },
    };

    const report: BugReportV1 = {
      ...baseReport(),
      bugFinders: [
        { category: "ui-feedback", bugs: [bug] },
        { category: "ui-feedback", bugs: [bug] },
      ],
    };

    const result = validateBugReportSemantics(report);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "duplicate-category",
    );
  });

  it("rejects runtime conditions on non-runtime finder categories", () => {
    const report: BugReportV1 = {
      ...baseReport(),
      bugFinders: [
        {
          category: "world-interaction",
          bugs: [
            {
              title: "Water affects outside blocks",
              severity: "major",
              foundBy: "tester",
              verification: "observed",
              problem: "World interaction escapes the build boundary.",
              expected: "Outside interaction is rejected.",
              observed: {
                gameplay: "Outside iron bars become waterlogged.",
              },
              runtimeConditions: {
                players: 5,
              },
            },
          ],
        },
      ],
    };

    const result = validateBugReportSemantics(report);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "runtime-conditions-outside-runtime-category",
    );
  });
});
