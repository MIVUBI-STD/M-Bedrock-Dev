import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  projectApprovedBugReportToHistoricalRegressions,
  syncApprovedProjectIssueHistory,
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
    expect(
      records[0]?.canonicalIssueId,
    ).toBe(
      "reg_defense_2_0_0_bug_001",
    );
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

  it("allows remote-only history sync from the exact persisted canonical report", async () => {
    const root =
      await mkdtemp(
        join(
          tmpdir(),
          "m-bedrock-history-",
        ),
      );
    try {
      const reportPath =
        "workspace/reports/Defense-v2.0.0-BugReport.json";
      await mkdir(
        join(
          root,
          "workspace/reports",
        ),
        { recursive: true },
      );
      await mkdir(
        join(
          root,
          "engine/reliability/catalogs",
        ),
        { recursive: true },
      );
      await writeFile(
        join(
          root,
          "engine/reliability/catalogs/regressions.json",
        ),
        JSON.stringify(
          {
            schemaVersion: 1,
            regressions: [],
          },
          null,
          2,
        ) + "\n",
        "utf8",
      );
      const report = {
        schema: "m-bedrock-bug-report/v2" as const,
        map: {
          name: "Defense",
          mapVersion: "2.0.0",
          drive:
            "https://drive.google.com/file/d/world-1/view",
          baseVersion: "2.0.0",
          testedVersion: "2.0.0",
        },
        repairBy: "developer" as const,
        bugs: [{
          id: "BUG-001",
          fixed: false,
          severity: "major" as const,
          category:
            "multiplayer-session" as const,
          foundBy: "ai" as const,
          issueType: "BUG" as const,
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
      };
      await writeFile(
        join(root, reportPath),
        JSON.stringify(report, null, 2) +
          "\n",
        "utf8",
      );

      const result =
        await syncApprovedProjectIssueHistory({
          repositoryRoot: root,
          project: {
            schemaVersion: 1,
            projectId: "defense-v2",
            projectName: "Defense",
            taskClass: "DIAGNOSE",
            revision: 1,
            artifact: {
              artifactId:
                "drive:world-1",
              artifactFingerprint:
                "sha256:defense",
              version: "2.0.0",
            },
            work: {},
            knowledge: {
              bugReportPath: reportPath,
            },
            publication: {
              drive: {
                schemaVersion: 1,
                projectId:
                  "defense-v2",
                mapFolder: {
                  folderId: "folder-1",
                },
                currentWorld: {
                  fileId: "world-1",
                  fileName:
                    "Defense.mcworld",
                  artifactFingerprint:
                    "sha256:defense",
                  version: "2.0.0",
                },
              },
            },
          },
          report,
          reportPath,
        });

      expect(
        result.historicalRegressionIds,
      ).toEqual([
        "reg_defense_2_0_0_bug_001",
      ]);
    } finally {
      await rm(
        root,
        {
          recursive: true,
          force: true,
        },
      );
    }
  });

  it("rejects history sync when incoming report differs from persisted canonical state", async () => {
    const root =
      await mkdtemp(
        join(
          tmpdir(),
          "m-bedrock-history-",
        ),
      );
    try {
      const reportPath =
        "workspace/reports/A-v1.0.0-BugReport.json";
      await mkdir(
        join(root, "workspace/reports"),
        { recursive: true },
      );
      await mkdir(
        join(
          root,
          "engine/reliability/catalogs",
        ),
        { recursive: true },
      );
      await writeFile(
        join(
          root,
          "engine/reliability/catalogs/regressions.json",
        ),
        JSON.stringify(
          {
            schemaVersion: 1,
            regressions: [],
          },
          null,
          2,
        ) + "\n",
        "utf8",
      );
      const persisted = {
        schema:
          "m-bedrock-bug-report/v2" as const,
        map: {
          name: "A",
          mapVersion: "1.0.0",
          drive:
            "https://drive.google.com/file/d/world-a/view",
          baseVersion: "1.0.0",
          testedVersion: "1.0.0",
        },
        repairBy: "developer" as const,
        bugs: [{
          id: "BUG-A",
          fixed: false,
          severity: "major" as const,
          category: "game-flow" as const,
          foundBy: "ai" as const,
          title: "A",
          problem: "A fails.",
          expected: "A works.",
          observed: "A fails.",
        }],
      };
      await writeFile(
        join(root, reportPath),
        JSON.stringify(
          persisted,
          null,
          2,
        ) + "\n",
        "utf8",
      );

      await expect(
        syncApprovedProjectIssueHistory({
          repositoryRoot: root,
          project: {
            schemaVersion: 1,
            projectId: "a",
            projectName: "A",
            taskClass: "DIAGNOSE",
            revision: 1,
            artifact: {
              artifactId:
                "drive:world-a",
              artifactFingerprint:
                "sha256:a",
              version: "1.0.0",
            },
            work: {},
            knowledge: {
              bugReportPath:
                reportPath,
            },
            publication: {
              drive: {
                schemaVersion: 1,
                projectId: "a",
                mapFolder: {
                  folderId: "folder-a",
                },
                currentWorld: {
                  fileId: "world-a",
                  fileName: "A.mcworld",
                  artifactFingerprint:
                    "sha256:a",
                  version: "1.0.0",
                },
              },
            },
          },
          report: {
            ...persisted,
            bugs: [{
              ...persisted.bugs[0]!,
              observed:
                "Different actual result.",
            }],
          },
          reportPath,
        }),
      ).rejects.toThrow(
        /does not match the persisted canonical/i,
      );
    } finally {
      await rm(
        root,
        {
          recursive: true,
          force: true,
        },
      );
    }
  });
});
