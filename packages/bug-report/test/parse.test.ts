import { describe, expect, it } from "vitest";
import {
  parseBugReportJson,
  parseBugReportV1,
} from "../src/index.js";

function validReport() {
  return {
    schema: "m-bedrock-bug-report/v1",
    map: {
      name: "Blitz Build",
      version: "1.0.3",
      minecraftVersion: "1.26.32",
      drive: "https://drive.google.com/file/d/map/view",
    },
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
              "Acquire an item",
              "Finish the match",
            ],
            expected: "Match inventory is cleared before returning to the lobby.",
            observed: {
              gameplay: "The match item remains in the lobby.",
            },
          },
        ],
      },
    ],
  };
}

describe("bug report ingest boundary", () => {
  it("parses a structurally and semantically valid report", () => {
    const result = parseBugReportV1(validReport());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.report.map.version).toBe("1.0.3");
      expect(result.report.bugFinders[0]?.category).toBe("player-state");
    }
  });

  it("rejects malformed JSON before structural parsing", () => {
    const result = parseBugReportJson("{");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0]?.code).toBe("invalid-json");
    }
  });

  it("rejects a missing mandatory map version", () => {
    const report = validReport();
    const { version: _version, ...map } = report.map;
    const result = parseBugReportV1({ ...report, map });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.path === "$.map.version")).toBe(true);
    }
  });

  it("rejects unknown fields instead of silently accepting drift", () => {
    const report = {
      ...validReport(),
      reportId: "noise",
    };
    const result = parseBugReportV1(report);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.code === "unknown-field")).toBe(true);
    }
  });

  it("rejects legacy severity values", () => {
    const report = validReport();
    report.bugFinders[0]!.bugs[0]!.severity = "critical";
    const result = parseBugReportV1(report);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.path.endsWith(".severity"))).toBe(true);
    }
  });

  it("rejects ambiguous legacy origin labels", () => {
    const report = validReport();
    report.bugFinders[0]!.bugs[0]!.foundBy = "both";
    const result = parseBugReportV1(report);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.path.endsWith(".foundBy"))).toBe(true);
    }
  });

  it("rejects a structurally valid report that violates semantic rules", () => {
    const report = validReport();
    report.bugFinders[0]!.bugs[0]!.foundBy = "ai";
    report.bugFinders[0]!.bugs[0]!.verification = "verified";
    report.bugFinders[0]!.bugs[0]!.observed = {
      code: "A stale branch is reachable.",
    };
    const result = parseBugReportV1(report);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.code === "semantic-error")).toBe(true);
    }
  });

  it("rejects evidence outside Google Drive", () => {
    const report = validReport();
    report.bugFinders[0]!.bugs[0]!.evidence = [
      {
        description: "Reproduction video",
        drive: "https://example.com/video.mp4",
      },
    ];
    const result = parseBugReportV1(report);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.path.endsWith(".evidence[0].drive"))).toBe(true);
    }
  });
});
