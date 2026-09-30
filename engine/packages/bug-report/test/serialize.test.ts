import { describe, expect, it } from "vitest";
import {
  BUG_REPORT_SCHEMA,
  normalizeBugReportV1,
  parseBugReportJson,
  serializeBugReportV1,
  type BugReportV1,
} from "../src/index.js";

function report(): BugReportV1 {
  return {
    schema: BUG_REPORT_SCHEMA,
    map: {
      name: "Blitz Build",
      version: "1.0.3",
      minecraftVersion: "1.26.32",
      drive: "https://drive.google.com/file/d/map/view",
    },
    bugFinders: [
      {
        category: "ui-feedback",
        bugs: [
          {
            title: "Join pad particle is missing",
            severity: "minor",
            foundBy: "tester",
            verification: "observed",
            problem: "Players lose visual feedback for join-pad state.",
            reproduction: [
              "Enter the lobby",
              "Approach an arena join pad",
            ],
            expected: "The join pad shows its intended visual indicator.",
            observed: {
              gameplay: "The expected join-pad particle is not visible.",
            },
          },
        ],
      },
      {
        category: "world-interaction",
        bugs: [
          {
            title: "Water affects blocks outside active plot",
            severity: "major",
            foundBy: "ai+tester",
            verification: "verified",
            problem: "Players can mutate world state outside their build area.",
            preconditions: [
              "Building phase is active",
            ],
            reproduction: [
              "Enter the active build plot",
              "Use a water bucket on iron bars outside the plot",
            ],
            reproducibility: {
              attempts: 3,
              reproduced: 3,
            },
            expected: "All outside-plot world interaction is rejected.",
            observed: {
              gameplay: "Outside iron bars become waterlogged.",
              code: "Bucket mutation bypasses the normal plot-containment gate.",
            },
            evidence: [
              {
                description: "Gameplay reproduction of outside-plot waterlogging.",
                drive: "https://drive.google.com/file/d/evidence/view",
              },
            ],
            diagnosis: "Bucket use follows a separate mutation path.",
            rootCause: "The bucket path omits active-plot containment validation.",
            relevantCode: [
              {
                file: "scripts/arena/session.ts",
                reason: "Processes bucket interaction during building.",
                lines: "318-352",
              },
            ],
            repairDirection: "Route bucket mutation through the existing containment policy.",
            mustPreserve: [
              "Water remains usable inside the active build plot.",
            ],
            fixValidation: [
              "Verify outside-plot water interaction is rejected",
              "Verify water still works inside the plot",
            ],
          },
        ],
      },
    ],
  };
}

describe("bug report canonical serialization", () => {
  it("round-trips without losing repair context", () => {
    const source = report();
    const serialized = serializeBugReportV1(source);
    expect(serialized.ok).toBe(true);

    if (!serialized.ok) return;

    const parsed = parseBugReportJson(serialized.json);
    expect(parsed.ok).toBe(true);

    if (!parsed.ok) return;

    expect(parsed.report).toEqual(normalizeBugReportV1(source));
  });

  it("does not truncate long diagnostic content", () => {
    const source = report();
    const longDiagnosis = "diagnostic detail ".repeat(1000);
    const modified: BugReportV1 = {
      ...source,
      bugFinders: source.bugFinders.map((finder) =>
        finder.category === "world-interaction"
          ? {
              ...finder,
              bugs: finder.bugs.map((entry) => ({
                ...entry,
                diagnosis: longDiagnosis,
              })),
            }
          : finder,
      ),
    };

    const serialized = serializeBugReportV1(modified);
    expect(serialized.ok).toBe(true);
    if (!serialized.ok) return;

    expect(serialized.json).toContain(longDiagnosis);

    const parsed = parseBugReportJson(serialized.json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const parsedBug = parsed.report.bugFinders
      .find((finder) => finder.category === "world-interaction")
      ?.bugs[0];
    expect(parsedBug?.diagnosis).toBe(longDiagnosis);
  });

  it("rejects semantically invalid reports instead of exporting them", () => {
    const source = report();
    const modified: BugReportV1 = {
      ...source,
      bugFinders: source.bugFinders.map((finder) =>
        finder.category === "world-interaction"
          ? {
              ...finder,
              bugs: finder.bugs.map((entry) => ({
                ...entry,
                foundBy: "ai" as const,
                verification: "verified" as const,
                observed: {
                  code: "A risky code path exists.",
                },
              })),
            }
          : finder,
      ),
    };

    const serialized = serializeBugReportV1(modified);
    expect(serialized.ok).toBe(false);
  });

  it("emits deterministic pretty JSON with a trailing newline", () => {
    const first = serializeBugReportV1(report());
    const second = serializeBugReportV1(report());
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    expect(first.json).toBe(second.json);
    expect(first.json.endsWith("\n")).toBe(true);
  });
});
