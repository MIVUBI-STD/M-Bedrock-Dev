import { describe, expect, it } from "vitest";
import {
  projectApprovedBugReportToHistoricalRegressions,
} from "../src/workflow/project-history-sync.js";

describe("project historical issue projection", () => {
  it("projects canonical approved bugs into searchable historical incidents", () => {
    const records =
      projectApprovedBugReportToHistoricalRegressions({
        projectId: "defense-v2",
        report: {
          schema: "m-bedrock-bug-report/v2",
          map: {
            name: "Defense",
            mapVersion: "2.0.0",
            drive:
              "https://drive.google.com/example",
            baseVersion: "2.0.0",
            testedVersion: "2.0.0",
          },
          repairBy: "developer",
          bugs: [{
            id: "BUG-001",
            fixed: false,
            severity: "major",
            category: "multiplayer-session",
            foundBy: "ai",
            title: "Arena state leaks",
            problem:
              "Arena-local state is shared.",
            expected:
              "Each arena owns isolated state.",
            observed:
              "Two arenas can write the same state.",
            reproduction: [
              "Start two arenas.",
              "Observe shared state.",
            ],
          }],
        },
        reportPath:
          "workspace/reports/Defense-v2.0.0-BugReport.json",
        artifactFingerprint:
          "sha256:defense",
      });

    expect(records).toHaveLength(1);
    expect(records[0]?.id)
      .toBe("reg_defense_2_0_0_bug_001");
    expect(records[0]?.domain)
      .toBe("multiplayer");
    expect(records[0]?.discoveredBy)
      .toBe("approved-ai");
    expect(
      records[0]?.provenance
        ?.artifactFingerprint,
    ).toBe("sha256:defense");
    expect(
      records[0]?.provenance?.projectId,
    ).toBe("defense-v2");
    expect(records[0]?.issueType).toBe("BUG");
  });

  it("preserves design mismatch type in historical learning", () => {
    const records =
      projectApprovedBugReportToHistoricalRegressions({
        projectId: "arena-capacity",
        report: {
          schema: "m-bedrock-bug-report/v2",
          map: {
            name: "Arena Map",
            mapVersion: "1.0.0",
            drive:
              "https://drive.google.com/example",
            baseVersion: "1.0.0",
            testedVersion: "1.0.0",
          },
          repairBy: "developer",
          bugs: [{
            id: "DM-001",
            fixed: false,
            severity: "major",
            category: "multiplayer-session",
            foundBy: "ai",
            issueType: "DESIGN_MISMATCH",
            title: "Visible capacity exceeds concurrency",
            problem:
              "Players see more arenas than can run concurrently.",
            expected:
              "Presented capacity matches playable capacity.",
            observed:
              "Additional ready arenas are queued.",
            reproduction: [
              "Start the supported number of arenas.",
              "Start one additional visible arena and observe it queue.",
            ],
          }],
        },
        reportPath:
          "workspace/reports/Arena-v1.0.0-BugReport.json",
        artifactFingerprint:
          "sha256:arena",
      });

    expect(records[0]?.issueType)
      .toBe("DESIGN_MISMATCH");
    expect(
      records[0]?.provenance?.issueType,
    ).toBe("DESIGN_MISMATCH");
    expect(records[0]?.triggerTags)
      .toContain("design-mismatch");
  });
});
