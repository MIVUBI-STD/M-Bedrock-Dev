import {
  describe,
  expect,
  it,
} from "vitest";
import {
  createBugReportV2,
  type CreateBugReportV2Input,
} from "../src/index.js";

function validInput(): CreateBugReportV2Input {
  return {
    map: {
      name: "Beach Bedwars",
      mapVersion: "1.0.4",
      drive: "https://drive.google.com/file/d/map/view",
      baseVersion: "1.26.20",
      testedVersion: "1.26.32",
    },
    repairBy: "developer",
    bugs: [{
      id: "BUG-BBW-001",
      severity: "major",
      category: "multiplayer-session",
      foundBy: "ai",
      title: "Reconnect loses arena state",
      problem: "Arena state is stale after reconnect.",
      expected: "The player rejoins the same arena cleanly.",
      observed: "The previous membership remains active.",
      reproduction: [
        "Join an arena and start a match.",
        "Disconnect and reconnect.",
        "Confirm the previous arena membership remains bound to the old session.",
      ],
      aiAnalysis:
        "The reconnect path keeps stale arena membership.",
      relevantCode: [{
        file: "scripts/session.ts",
        reason: "Owns reconnect session membership.",
      }],
      suggestedFix:
        "Rebind arena membership to the new session.",
    }],
  };
}

describe("createBugReportV2", () => {
  it("creates a tester-ready canonical report", () => {
    const report = createBugReportV2(validInput());

    expect(report.schema).toBe("m-bedrock-bug-report/v2");
    expect(report.bugs[0]?.fixed).toBe(false);
    expect(report.repairBy).toBe("developer");
  });

  it("rejects invalid schema data at creation time", () => {
    const input = validInput();
    expect(() =>
      createBugReportV2({
        ...input,
        map: {
          ...input.map,
          testedVersion: "",
        },
      })
    ).toThrow(/creation failed/);
  });

  it("rejects an invalid canonical map Drive URL", () => {
    const input = validInput();
    expect(() =>
      createBugReportV2({
        ...input,
        map: {
          ...input.map,
          drive: "https://example.com/map",
        },
      })
    ).toThrow(/creation failed/);
  });

  it("rejects a report without Bug Trigger (In-Game)", () => {
    const input = validInput();
    const [bug] = input.bugs;
    if (!bug) throw new Error("Fixture bug is missing.");

    const {
      reproduction: _reproduction,
      ...withoutTrigger
    } = bug;

    expect(() =>
      createBugReportV2({
        ...input,
        bugs: [withoutTrigger],
      })
    ).toThrow(/readiness failed/);
  });

  it("rejects AI-found bugs without Relevant Code", () => {
    const input = validInput();
    const [bug] = input.bugs;
    if (!bug) throw new Error("Fixture bug is missing.");

    const {
      relevantCode: _relevantCode,
      ...withoutRelevantCode
    } = bug;

    expect(() =>
      createBugReportV2({
        ...input,
        bugs: [withoutRelevantCode],
      })
    ).toThrow(/readiness failed/);
  });
});
