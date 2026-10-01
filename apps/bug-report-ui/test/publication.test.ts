import { describe, expect, it } from "vitest";
import {
  buildBugReportPublicationPayload,
} from "../src/index.js";
import type {
  BugReportV2,
} from "../../../engine/packages/bug-report/src/index.js";

function report(): BugReportV2 {
  return {
    schema: "m-bedrock-bug-report/v2",
    map: {
      name: "Attack Challenge",
      mapVersion: "1.1.1",
      drive: "https://drive.google.com/file/d/map/view",
      baseVersion: "1.26.20",
      testedVersion: "1.26.32",
    },
    repairBy: "developer",
    bugs: [{
      id: "BUG-AC-A",
      fixed: false,
      severity: "major",
      category: "game-flow",
      foundBy: "tester",
      title: "Level cannot continue",
      problem:
        "The level stops after the objective and players cannot continue.",
      expected:
        "The next phase starts after the objective is completed.",
      observed:
        "The current phase remains active and the next phase never starts.",
      reproduction: [
        "Start the affected level.",
        "Complete the objective.",
        "Confirm the next phase does not start.",
      ],
      suggestedFix:
        "Advance the level state after the objective is completed.",
    }],
  };
}

describe("bug report publication payload", () => {
  it("uses one quality-gated client document for Google Docs and PDF", () => {
    const payload =
      buildBugReportPublicationPayload(report());

    expect(payload.googleDocTitle).toBe(
      "Attack Challenge v1.1.1 - Bug Report",
    );
    expect(payload.pdfFileName).toBe(
      "Attack Challenge v1.1.1 - Bug Report.pdf",
    );
    expect(payload.document.issues).toHaveLength(1);
    expect(payload.document.issues[0]?.title).toBe(
      "Level cannot continue",
    );
  });
});
